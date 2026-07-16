import { ZeptoAdapter } from './adapters/zepto';
import { BlinkitAdapter } from './adapters/blinkit';
import { BigBasketAdapter } from './adapters/bigbasket';
import { DatabaseSync, prisma } from './core/db';
import { ScraperLogger } from './core/logger';
import { scraperConfig } from './config';
import { SearchEngine } from './core/search/SearchEngine';

export class ScraperOrchestrator {
  private adapters = [new ZeptoAdapter(), new BlinkitAdapter(), new BigBasketAdapter()];
  private dbSync = new DatabaseSync();
  private logger = new ScraperLogger('Orchestrator');
  private searchEngine = new SearchEngine();

  constructor() {
    this.logger.info(`Registered adapters: \n${this.adapters.map(a => `✓ ${a.getPlatform().name}`).join('\n')}`);
  }

  async getSearchResults(query: string, filters?: any, pagination?: any) {
    this.logger.info(`Incoming search request for: ${query}`);
    
    // 1. Fetch from DB
    const dbResponse = await this.fetchFromDB(query, filters, pagination);
    const dbProducts = dbResponse.results;
    
    // 2. Check Freshness
    let isStale = false;
    let hasData = dbProducts.length > 0;
    
    if (hasData) {
      const now = Date.now();
      // Check the oldest lastScrapedAt among listings for the search query
      const oldestScrape = dbProducts.reduce((oldest, product) => {
        const productOldest = product.listings.reduce((min: number, listing: any) => {
          const scrapeTime = listing.lastScrapedAt.getTime();
          return scrapeTime < min ? scrapeTime : min;
        }, now);
        return productOldest < oldest ? productOldest : oldest;
      }, now);
      
      const ageMs = now - oldestScrape;
      if (ageMs > scraperConfig.cache.freshnessWindowMs) {
        isStale = true;
      }
    }

    // 3. Waterfall Logic
    if (hasData && !isStale) {
      this.logger.info('Cache HIT (Fresh)', undefined, { cache_status: 'HIT', query });
      return dbResponse;
    }

    if (hasData && isStale) {
      this.logger.info('Cache HIT (Stale) - Triggering background refresh', undefined, { cache_status: 'STALE', query });
      // Trigger background refresh but return stale data immediately
      this.searchAndSyncAll(query).catch(e => this.logger.error('Background refresh failed', { error: e.message }));
      return dbResponse;
    }

    // No data -> await live scrape
    this.logger.info('Cache MISS - Awaiting live scrape', undefined, { cache_status: 'MISS', query });
    const scrapedCount = await this.searchAndSyncAll(query);
    
    if (scrapedCount > 0) {
      return this.fetchFromDB(query, filters, pagination);
    }
    
    return dbResponse;
  }

  /**
   * Executes all registered adapters for a query
   */
  private async searchAndSyncAll(query: string): Promise<number> {
    const startTime = Date.now();
    let totalSynced = 0;

    for (const adapter of this.adapters) {
      try {
        console.log('[DIAGNOSTIC] F. Before scraper execution for adapter');
        const platformMeta = adapter.getPlatform();
        this.logger.info(`Orchestrating search on ${platformMeta.name} for: ${query}`);
        
        const results = await adapter.search(query);
        console.log('[DIAGNOSTIC] G. After scraper execution for adapter:', platformMeta?.name);
        if (results.length > 0) {
          await this.dbSync.syncScraperResults(adapter, results);
          totalSynced += results.length;
        }

        this.logger.info(`Completed sync for ${platformMeta.name}`, undefined, {
          execution_time_ms: Date.now() - startTime,
          success: true,
          platform: platformMeta.slug,
          query,
          products_found: results.length
        });
      } catch (error: any) {
        console.error('[DIAGNOSTIC EXCEPTION in searchAndSyncAll adapter loop]', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          file: 'src/scraper/index.ts',
          line: 'adapter.search',
          adapter: adapter?.constructor?.name
        });
        
        let platformSlug = 'unknown';
        try { platformSlug = adapter.getPlatform().slug; } catch(e) {}
        
        this.logger.error(`Adapter failed`, { error: error.message }, {
          execution_time_ms: Date.now() - startTime,
          success: false,
          platform: platformSlug,
          query,
          failure_reason: error.message
        });
      }
    }

    return totalSynced;
  }

  private async fetchFromDB(query: string, filters?: any, pagination?: any) {
    try {
      console.log('[DIAGNOSTIC] D. Before fetchFromDB() (SearchEngine call)');
      const response = await this.searchEngine.execute(query, filters, pagination);
      console.log('[DIAGNOSTIC] E. After fetchFromDB() (SearchEngine call)');
      return response;
    } catch (error: any) {
      console.error('[DIAGNOSTIC EXCEPTION in fetchFromDB]', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Export a singleton
export const scraperOrchestrator = new ScraperOrchestrator();
