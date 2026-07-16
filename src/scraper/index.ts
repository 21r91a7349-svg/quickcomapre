import { ZeptoAdapter } from './adapters/zepto';
import { BlinkitAdapter } from './adapters/blinkit';
import { DatabaseSync, prisma } from './core/db';
import { ScraperLogger } from './core/logger';
import { scraperConfig } from './config';

export class ScraperOrchestrator {
  private adapters = [new ZeptoAdapter(), new BlinkitAdapter()];
  private dbSync = new DatabaseSync();
  private logger = new ScraperLogger('Orchestrator');

  /**
   * API Handler: Implements Freshness Waterfall caching logic
   */
  async getSearchResults(query: string) {
    this.logger.info(`Incoming search request for: ${query}`);
    
    // 1. Fetch from DB
    const dbProducts = await this.fetchFromDB(query);
    
    // 2. Check Freshness
    let isStale = false;
    let hasData = dbProducts.length > 0;
    
    if (hasData) {
      const now = Date.now();
      // Check the oldest lastScrapedAt among listings for the search query
      const oldestScrape = dbProducts.reduce((oldest, product) => {
        const productOldest = product.listings.reduce((min, listing) => {
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
      return dbProducts;
    }

    if (hasData && isStale) {
      this.logger.info('Cache HIT (Stale) - Triggering background refresh', undefined, { cache_status: 'STALE', query });
      // Trigger background refresh but return stale data immediately
      this.searchAndSyncAll(query).catch(e => this.logger.error('Background refresh failed', { error: e.message }));
      return dbProducts;
    }

    // No data -> await live scrape
    this.logger.info('Cache MISS - Awaiting live scrape', undefined, { cache_status: 'MISS', query });
    const scrapedCount = await this.searchAndSyncAll(query);
    
    if (scrapedCount > 0) {
      return this.fetchFromDB(query);
    }
    
    return [];
  }

  /**
   * Executes all registered adapters for a query
   */
  private async searchAndSyncAll(query: string): Promise<number> {
    const startTime = Date.now();
    let totalSynced = 0;

    for (const adapter of this.adapters) {
      try {
        const platformMeta = adapter.getPlatform();
        this.logger.info(`Orchestrating search on ${platformMeta.name} for: ${query}`);
        
        const results = await adapter.search(query);
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
        this.logger.error(`Adapter failed`, { error: error.message }, {
          execution_time_ms: Date.now() - startTime,
          success: false,
          platform: adapter.getPlatform().slug,
          query,
          failure_reason: error.message
        });
      }
    }

    return totalSynced;
  }

  private async fetchFromDB(query: string) {
    // Simple ILIKE search using Prisma
    const dbProducts = await prisma.product.findMany({
      where: {
        OR: [
          { display_name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        listings: {
          include: {
            platform: true
          }
        }
      }
    });

    // Format to match UI types
    return dbProducts.map(p => ({
      id: p.id,
      display_name: p.display_name,
      brand: p.brand,
      quantity: p.quantity,
      unit: p.unit,
      canonical_image_url: p.canonical_image_url,
      listings: p.listings.map(l => ({
        id: l.id,
        platform: {
          name: l.platform.name,
          slug: l.platform.slug
        },
        currentPrice: Number(l.currentPrice),
        originalPrice: l.originalPrice ? Number(l.originalPrice) : null,
        discount: l.discount ? Number(l.discount) : null,
        inStock: l.inStock,
        deliveryTime: l.deliveryTime,
        productUrl: l.productUrl,
        lastScrapedAt: l.lastScrapedAt
      }))
    }));
  }
}

// Export a singleton
export const scraperOrchestrator = new ScraperOrchestrator();
