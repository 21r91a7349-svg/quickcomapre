import { ZeptoAdapter } from './adapters/zepto';
import { BlinkitAdapter } from './adapters/blinkit';
import { BigBasketAdapter } from './adapters/bigbasket';
import { DatabaseSync, prisma } from './core/db';
import { ScraperLogger } from './core/logger';
import { scraperConfig } from './config';
import { SearchEngine } from './core/search/SearchEngine';
import { createSearchTrace, printSearchTraceSummary, SearchTrace } from './core/search/SearchTrace';

export class ScraperOrchestrator {
  // Zepto is disabled per architecture decision; preserved for reference.
  private adapters = [new BlinkitAdapter(), new BigBasketAdapter()];
  private dbSync = new DatabaseSync();
  private logger = new ScraperLogger('Orchestrator');
  private searchEngine = new SearchEngine();

  constructor() {
    this.logger.info(`Registered active adapters: \n${this.adapters.map(a => `✓ ${a.getPlatform().name}`).join('\n')}`);
  }

  async getSearchResults(query: string, filters?: any, pagination?: any, requestId?: string) {
    const startTime = Date.now();
    const trace = createSearchTrace(query, requestId);
    this.logger.info(`Incoming search request for: ${query} [${trace.requestId}]`);
    
    // 1. Fetch from DB
    let dbResponse: any = null;
    const dbStartTime = Date.now();
    try {
      dbResponse = await this.fetchFromDB(query, filters, pagination);
      trace.database.durationMs = Date.now() - dbStartTime;
      trace.database.status = 'CONNECTED';
      trace.database.candidatesFound = dbResponse.total || 0;
    } catch (dbErr: any) {
      trace.database.durationMs = Date.now() - dbStartTime;
      trace.database.status = 'DEGRADED';
      trace.database.error = dbErr.message;
      trace.cache = 'DEGRADED';
      trace.scraper.status = 'SKIPPED';
      trace.totalResponseTimeMs = Date.now() - startTime;
      
      this.logger.error(`Database query failed (${dbErr.message}). Skipping scraping and returning degraded response.`, { query });
      printSearchTraceSummary(trace);
      
      return {
        total: 0,
        page: pagination?.page || 1,
        pages: 0,
        limit: pagination?.limit || 20,
        results: [],
        facets: { brands: [], categories: [], platforms: [], priceRange: { min: 0, max: 0 } },
        status: 'DEGRADED',
        error: 'Database service is currently unavailable.',
        trace: process.env.NODE_ENV !== 'production' ? trace : { requestId: trace.requestId }
      };
    }

    const dbProducts = dbResponse.results;
    
    // 2. Check Freshness
    let isStale = false;
    let hasData = dbProducts.length > 0;
    
    if (hasData) {
      const now = Date.now();
      const oldestScrape = dbProducts.reduce((oldest: number, product: any) => {
        const productOldest = (product.listings || []).reduce((min: number, listing: any) => {
          const scrapeTime = listing.lastScrapedAt ? new Date(listing.lastScrapedAt).getTime() : now;
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
      trace.cache = 'HIT_FRESH';
      trace.matching.canonicalCount = dbProducts.length;
      trace.ranking.count = dbProducts.length;
      trace.totalResponseTimeMs = Date.now() - startTime;
      this.logger.info('Cache HIT (Fresh)', undefined, { cache_status: 'HIT', query });
      printSearchTraceSummary(trace);
      return { ...dbResponse, trace: process.env.NODE_ENV !== 'production' ? trace : { requestId: trace.requestId } };
    }

    if (hasData && isStale) {
      trace.cache = 'HIT_STALE';
      trace.matching.canonicalCount = dbProducts.length;
      trace.ranking.count = dbProducts.length;
      trace.totalResponseTimeMs = Date.now() - startTime;
      this.logger.info('Cache HIT (Stale) - Triggering background refresh', undefined, { cache_status: 'STALE', query });
      this.searchAndSyncAll(query).catch(e => this.logger.error('Background refresh failed', { error: e.message }));
      printSearchTraceSummary(trace);
      return { ...dbResponse, trace: process.env.NODE_ENV !== 'production' ? trace : { requestId: trace.requestId } };
    }

    // No data -> await live scrape (Only reached if DB lookup succeeded and returned 0 products)
    trace.cache = 'MISS';
    this.logger.info('Cache MISS - Awaiting live scrape', undefined, { cache_status: 'MISS', query });
    
    const scrapeStartTime = Date.now();
    const scrapedCount = await this.searchAndSyncAll(query);
    trace.scraper.durationMs = Date.now() - scrapeStartTime;
    trace.scraper.status = 'EXECUTED';
    trace.scraper.adapters = this.adapters.map(a => a.getPlatform().slug);
    trace.scraper.scrapedCount = scrapedCount;
    
    if (scrapedCount > 0) {
      const refreshedResponse = await this.fetchFromDB(query, filters, pagination);
      trace.matching.canonicalCount = refreshedResponse.results.length;
      trace.ranking.count = refreshedResponse.results.length;
      trace.totalResponseTimeMs = Date.now() - startTime;
      printSearchTraceSummary(trace);
      return { ...refreshedResponse, trace: process.env.NODE_ENV !== 'production' ? trace : { requestId: trace.requestId } };
    }
    
    trace.totalResponseTimeMs = Date.now() - startTime;
    printSearchTraceSummary(trace);
    return { ...dbResponse, trace: process.env.NODE_ENV !== 'production' ? trace : { requestId: trace.requestId } };
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
