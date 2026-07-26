import { ZeptoAdapter } from './adapters/zepto';
import { BlinkitAdapter } from './adapters/blinkit';
import { BigBasketAdapter } from './adapters/bigbasket';
import { DatabaseSync } from './core/db';
import { ScraperLogger } from './core/logger';
import { scraperConfig } from './config';
import { SearchEngine } from './core/search/SearchEngine';
import { createSearchTrace, printSearchTraceSummary, SearchTrace } from './core/search/SearchTrace';
import { PlatformExecutionResult, PlatformStatusCode } from './types';

export class ScraperOrchestrator {
  private activeAdapters = [new BlinkitAdapter(), new BigBasketAdapter()];
  private dbSync = new DatabaseSync();
  private logger = new ScraperLogger('Orchestrator');
  private searchEngine = new SearchEngine();

  constructor() {
    this.logger.info(`Registered active adapters: \n${this.activeAdapters.map(a => `✓ ${a.getPlatform().name}`).join('\n')}`);
  }

  async getSearchResults(query: string, filters?: any, pagination?: any, requestId?: string) {
    const startTime = Date.now();
    const trace = createSearchTrace(query, requestId);
    this.logger.info(`Incoming search request for: "${query}" [${trace.requestId}]`);

    // 1. Attempt DB Cache Lookup
    let dbResponse: any = null;
    let dbProducts: any[] = [];
    const dbStartTime = Date.now();
    try {
      dbResponse = await this.fetchFromDB(query, filters, pagination);
      trace.database.durationMs = Date.now() - dbStartTime;
      trace.database.status = 'CONNECTED';
      trace.database.candidatesFound = dbResponse.total || 0;
      dbProducts = dbResponse.results || [];
    } catch (dbErr: any) {
      trace.database.durationMs = Date.now() - dbStartTime;
      trace.database.status = 'DEGRADED';
      trace.database.error = dbErr.message;
      this.logger.warn(`Database query failed (${dbErr.message}). Proceeding with live scrapers.`, { query });
    }

    // 2. Check Cache Freshness
    let isStale = false;
    let hasData = dbProducts.length > 0;
    let cacheAgeMinutes = 0;

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
      cacheAgeMinutes = ageMs / (1000 * 60);
      if (ageMs > scraperConfig.cache.freshnessWindowMs) {
        isStale = true;
      }
    }

    trace.cache.cacheAgeMinutes = cacheAgeMinutes;
    trace.cache.ttlMinutes = scraperConfig.cache.freshnessWindowMs / (1000 * 60);

    // 3. Cache FRESH HIT -> Return immediately
    if (hasData && !isStale) {
      trace.cache.status = 'FRESH_HIT';
      trace.matching.canonicalCount = dbProducts.length;
      trace.ranking.count = dbProducts.length;
      trace.totalResponseTimeMs = Date.now() - startTime;
      this.logger.info(`Cache HIT (Fresh, age: ${cacheAgeMinutes.toFixed(1)}m)`, undefined, { query });
      printSearchTraceSummary(trace);
      return {
        ...dbResponse,
        platformStatus: this.getInitialPlatformStatus(),
        trace
      };
    }

    // 4. Cache MISS, STALE, or DB DEGRADED -> Synchronous Parallel Live Scraping
    trace.cache.status = hasData ? 'STALE_HIT' : 'MISS';
    this.logger.info(`Cache ${trace.cache.status} (age: ${cacheAgeMinutes.toFixed(1)}m) - Running live scrapers in parallel`, undefined, { query });

    const scrapeStartTime = Date.now();
    const { totalScraped, totalNormalized, platformStatus, adapterResults, allScrapedProducts } = await this.searchAndSyncAllParallel(query);

    trace.scraper.durationMs = Date.now() - scrapeStartTime;
    trace.scraper.status = 'EXECUTED';
    trace.scraper.adaptersCount = this.activeAdapters.length;
    trace.scraper.scrapedCount = totalScraped;
    trace.scraper.normalizedCount = totalNormalized;
    trace.scraper.adapterResults = adapterResults;

    // 5. Try DB Re-query for canonical results if DB is available
    if (trace.database.status === 'CONNECTED') {
      try {
        const refreshedResponse = await this.fetchFromDB(query, filters, pagination);
        trace.matching.canonicalCount = refreshedResponse.results.length;
        trace.ranking.count = refreshedResponse.results.length;
        trace.totalResponseTimeMs = Date.now() - startTime;
        printSearchTraceSummary(trace);

        return {
          ...refreshedResponse,
          platformStatus,
          trace
        };
      } catch (err: any) {
        this.logger.error(`Post-scrape DB re-query failed: ${err.message}`);
      }
    }

    // Fallback: If DB is unreachable or unseeded, compose canonical cards directly in-memory from scraped products
    const inMemoryCanonicals = this.composeInMemoryCanonicals(allScrapedProducts);
    trace.matching.canonicalCount = inMemoryCanonicals.length;
    trace.ranking.count = inMemoryCanonicals.length;
    trace.totalResponseTimeMs = Date.now() - startTime;
    printSearchTraceSummary(trace);

    return {
      total: inMemoryCanonicals.length,
      page: pagination?.page || 1,
      pages: 1,
      limit: pagination?.limit || 20,
      results: inMemoryCanonicals,
      facets: { brands: [], categories: [], platforms: ['Blinkit', 'BigBasket'], priceRange: { min: 0, max: 0 } },
      platformStatus,
      trace
    };
  }

  /**
   * Executes active platform adapters in parallel with Promise.allSettled() and per-adapter timeout.
   */
  private async searchAndSyncAllParallel(query: string) {
    const platformStatus: Record<string, { status: PlatformStatusCode; products: number; latencyMs: number; error?: string }> = this.getInitialPlatformStatus();
    const adapterResults: Record<string, PlatformExecutionResult> = {};
    let allScrapedProducts: any[] = [];

    const timeoutMs = scraperConfig.timeouts.adapterTimeoutMs;
    let totalScraped = 0;
    let totalNormalized = 0;

    const adapterPromises = this.activeAdapters.map(async (adapter) => {
      const platformMeta = adapter.getPlatform();
      const adapterStartTime = Date.now();

      try {
        const searchPromise = adapter.search(query);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        );

        const scrapedProducts = await Promise.race([searchPromise, timeoutPromise]);
        const latencyMs = Date.now() - adapterStartTime;

        if (scrapedProducts.length > 0) {
          totalScraped += scrapedProducts.length;
          totalNormalized += scrapedProducts.length;
          allScrapedProducts = [...allScrapedProducts, ...scrapedProducts];

          // Sync to DB if connected
          try {
            await this.dbSync.syncScraperResults(adapter, scrapedProducts);
          } catch (syncErr: any) {
            this.logger.warn(`DB sync warning for ${platformMeta.name}: ${syncErr.message}`);
          }

          platformStatus[platformMeta.name] = {
            status: 'SUCCESS',
            products: scrapedProducts.length,
            latencyMs
          };

          adapterResults[platformMeta.slug] = {
            platform: platformMeta.name,
            slug: platformMeta.slug,
            status: 'SUCCESS',
            productsScraped: scrapedProducts.length,
            productsNormalized: scrapedProducts.length,
            latencyMs
          };
        } else {
          platformStatus[platformMeta.name] = {
            status: 'ZERO_RESULTS',
            products: 0,
            latencyMs
          };

          adapterResults[platformMeta.slug] = {
            platform: platformMeta.name,
            slug: platformMeta.slug,
            status: 'ZERO_RESULTS',
            productsScraped: 0,
            productsNormalized: 0,
            latencyMs
          };
        }
      } catch (err: any) {
        const latencyMs = Date.now() - adapterStartTime;
        const isTimeout = err.message?.includes('Timeout');
        const isBlocked = err.message?.includes('403') || err.message?.includes('Cloudflare');

        const statusCode: PlatformStatusCode = isTimeout
          ? 'TIMEOUT'
          : isBlocked
            ? 'BLOCKED_BY_ANTI_BOT'
            : 'NETWORK_FAILED';

        platformStatus[platformMeta.name] = {
          status: statusCode,
          products: 0,
          latencyMs,
          error: err.message
        };

        adapterResults[platformMeta.slug] = {
          platform: platformMeta.name,
          slug: platformMeta.slug,
          status: statusCode,
          productsScraped: 0,
          productsNormalized: 0,
          latencyMs,
          error: err.message
        };
      }
    });

    await Promise.allSettled(adapterPromises);

    return { totalScraped, totalNormalized, platformStatus, adapterResults, allScrapedProducts };
  }

  private composeInMemoryCanonicals(scrapedProducts: any[]) {
    const productMap = new Map<string, any>();

    for (const p of scrapedProducts) {
      const key = p.normalized_name;
      if (!productMap.has(key)) {
        productMap.set(key, {
          id: `inmem-${Math.random().toString(36).substring(2, 8)}`,
          display_name: p.display_name,
          brand: p.brand,
          quantity: p.quantity,
          unit: p.unit,
          canonical_image_url: p.canonical_image_url,
          searchScore: 100,
          intentMatch: 'exact',
          listings: []
        });
      }

      const canonical = productMap.get(key);
      canonical.listings.push({
        id: `listing-${Math.random().toString(36).substring(2, 8)}`,
        platform: { name: p.platform || 'Blinkit', slug: (p.platform || 'Blinkit').toLowerCase() },
        currentPrice: p.currentPrice,
        originalPrice: p.originalPrice,
        discount: p.discount,
        inStock: p.inStock,
        deliveryTime: p.deliveryTime || '10-20 mins',
        productUrl: p.productUrl,
        lastScrapedAt: new Date().toISOString()
      });
    }

    return Array.from(productMap.values());
  }

  private getInitialPlatformStatus() {
    return {
      'Blinkit': { status: 'SUCCESS' as PlatformStatusCode, products: 0, latencyMs: 0 },
      'BigBasket': { status: 'SUCCESS' as PlatformStatusCode, products: 0, latencyMs: 0 },
      'Zepto': { status: 'DISABLED' as PlatformStatusCode, products: 0, latencyMs: 0 },
      'Swiggy Instamart': { status: 'NOT_IMPLEMENTED' as PlatformStatusCode, products: 0, latencyMs: 0 }
    };
  }

  private async fetchFromDB(query: string, filters?: any, pagination?: any) {
    return this.searchEngine.execute(query, filters, pagination);
  }
}

// Export a singleton
export const scraperOrchestrator = new ScraperOrchestrator();
