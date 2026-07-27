import { BlinkitAdapter } from './adapters/blinkit';
import { BigBasketAdapter } from './adapters/bigbasket';
import { ZeptoAdapter } from './adapters/zepto';
import { AdapterRegistry } from './core/AdapterRegistry';
import { DatabaseSync } from './core/db';
import { ScraperLogger } from './core/logger';
import { scraperConfig } from './config';
import { SearchEngine } from './core/search/SearchEngine';
import { createSearchTrace, derivePlatformStatus, printSearchTraceSummary } from './core/search/SearchTrace';
import { PlatformExecutionResult, PlatformStatusCode, DbSyncResult } from './types';

export class ScraperOrchestrator {
  private registry = new AdapterRegistry();
  private dbSync = new DatabaseSync();
  private logger = new ScraperLogger('Orchestrator');
  private searchEngine = new SearchEngine();

  constructor() {
    // Register all known adapters — registry handles isEnabled() filtering
    this.registry.register(new BlinkitAdapter());
    this.registry.register(new BigBasketAdapter());
    this.registry.register(new ZeptoAdapter());

    const searchAdapters = this.registry.getSearchAdapters();
    this.logger.info(`Active search adapters (${searchAdapters.length}):\n${searchAdapters.map(a => `  ✓ ${a.getPlatform().name} (priority=${a.priority})`).join('\n')}`);

    const disabled = this.registry.getAllRegistered().filter(a => !a.isEnabled());
    if (disabled.length > 0) {
      this.logger.info(`Disabled adapters:\n${disabled.map(a => `  ✗ ${a.getPlatform().name}`).join('\n')}`);
    }
  }

  getRegistry(): AdapterRegistry {
    return this.registry;
  }

  async getSearchResults(query: string, filters?: any, pagination?: any, requestId?: string) {
    const startTime = Date.now();
    const trace = createSearchTrace(query, requestId);
    this.logger.info(`Search request: "${query}" [${trace.requestId}]`);

    // Collect all registered adapters for status derivation
    const allRegistered = this.registry.getAllRegistered().map(a => ({
      slug: a.getPlatform().slug,
      name: a.getPlatform().name,
      isEnabled: a.isEnabled(),
    }));

    // 1. DB Cache Lookup
    let dbResponse: any = null;
    let dbProducts: any[] = [];
    const cacheStart = Date.now();
    try {
      dbResponse = await this.fetchFromDB(query, filters, pagination);
      trace.database.durationMs = Date.now() - cacheStart;
      trace.database.status = 'CONNECTED';
      trace.database.candidatesFound = dbResponse.total || 0;
      dbProducts = dbResponse.results || [];
    } catch (dbErr: any) {
      trace.database.durationMs = Date.now() - cacheStart;
      trace.database.status = 'DEGRADED';
      trace.database.error = dbErr.message;
      this.logger.warn(`DB query failed (${dbErr.message}). Proceeding with live scrapers.`, { query });
    }
    trace.timing.cacheLookupMs = Date.now() - cacheStart;

    // 2. Cache Freshness Check
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

    // 3. FRESH_HIT → Return immediately, report SKIPPED_CACHE_FRESH for all adapters
    if (hasData && !isStale) {
      trace.cache.status = 'FRESH_HIT';
      trace.cache.durationMs = Date.now() - cacheStart;
      trace.scraper.status = 'SKIPPED';
      trace.matching.canonicalCount = dbProducts.length;
      trace.ranking.count = dbProducts.length;
      trace.totalResponseTimeMs = Date.now() - startTime;
      trace.timing.totalLatencyMs = trace.totalResponseTimeMs;
      this.logger.info(`Cache FRESH_HIT (age: ${cacheAgeMinutes.toFixed(1)}m)`, undefined, { query });
      printSearchTraceSummary(trace);

      const platformStatus = derivePlatformStatus(trace, allRegistered);
      return { ...dbResponse, platformStatus, trace };
    }

    // 4. STALE or MISS → Execute all enabled adapters in parallel
    trace.cache.status = hasData ? 'STALE_HIT' : 'MISS';
    trace.cache.durationMs = Date.now() - cacheStart;
    this.logger.info(`Cache ${trace.cache.status} — executing live scrapers`, undefined, { query });

    const adapterStart = Date.now();
    const { totalScraped, totalNormalized, adapterResults, allScrapedProducts, syncResults } =
      await this.executeAdaptersAndSync(query);
    trace.timing.adapterExecutionMs = Date.now() - adapterStart;

    trace.scraper.status = 'EXECUTED';
    trace.scraper.adaptersCount = this.registry.getSearchAdapters().length;
    trace.scraper.scrapedCount = totalScraped;
    trace.scraper.normalizedCount = totalNormalized;
    trace.scraper.adapterResults = adapterResults;
    trace.scraper.durationMs = trace.timing.adapterExecutionMs;

    // Aggregate DB sync metrics from all adapters
    for (const sr of syncResults) {
      trace.dbSync.syncErrorsCount += sr.syncErrorsCount;
      trace.dbSync.newCanonicalCount += sr.newCanonicalCount;
      trace.dbSync.mergedListingsCount += sr.mergedListingsCount;
      trace.dbSync.priceUpdatesCount += sr.priceUpdatesCount;
      trace.dbSync.failedListingsCount += sr.failedListingsCount;
      trace.dbSync.duplicatesSkippedCount += sr.duplicatesSkippedCount;
      trace.dbSync.matchedCount += sr.syncedCount;
    }
    trace.dbSync.scrapedCount = totalScraped;
    trace.dbSync.normalizedCount = totalNormalized;

    // 5. Re-query DB for canonical results
    if (trace.database.status === 'CONNECTED') {
      const reqStart = Date.now();
      try {
        const refreshedResponse = await this.fetchFromDB(query, filters, pagination);
        trace.timing.dbRequeryMs = Date.now() - reqStart;
        trace.matching.canonicalCount = refreshedResponse.results.length;
        trace.ranking.count = refreshedResponse.results.length;
        trace.totalResponseTimeMs = Date.now() - startTime;
        trace.timing.totalLatencyMs = trace.totalResponseTimeMs;
        printSearchTraceSummary(trace);

        const platformStatus = derivePlatformStatus(trace, allRegistered);
        return { ...refreshedResponse, platformStatus, trace };
      } catch (err: any) {
        trace.timing.dbRequeryMs = Date.now() - reqStart;
        this.logger.error(`Post-scrape DB re-query failed: ${err.message}`);
      }
    }

    // 6. In-memory fallback if DB unavailable
    const inMemoryCanonicals = this.composeInMemoryCanonicals(allScrapedProducts);
    trace.matching.canonicalCount = inMemoryCanonicals.length;
    trace.ranking.count = inMemoryCanonicals.length;
    trace.totalResponseTimeMs = Date.now() - startTime;
    trace.timing.totalLatencyMs = trace.totalResponseTimeMs;
    printSearchTraceSummary(trace);

    const platformStatus = derivePlatformStatus(trace, allRegistered);
    const enabledNames = this.registry.getSearchAdapters().map(a => a.getPlatform().name);
    return {
      total: inMemoryCanonicals.length,
      page: pagination?.page || 1,
      pages: 1,
      limit: pagination?.limit || 20,
      results: inMemoryCanonicals,
      facets: { brands: [], categories: [], platforms: enabledNames, priceRange: { min: 0, max: 0 } },
      platformStatus,
      trace
    };
  }

  /**
   * Execute all enabled search adapters in parallel with independent timeouts,
   * sync results to DB, and collect execution telemetry.
   */
  private async executeAdaptersAndSync(query: string) {
    const adapterResults: Record<string, PlatformExecutionResult> = {};
    const syncResults: DbSyncResult[] = [];
    let allScrapedProducts: any[] = [];
    let totalScraped = 0;
    let totalNormalized = 0;

    const timeoutMs = scraperConfig.timeouts.adapterTimeoutMs;
    const searchAdapters = this.registry.getSearchAdapters();

    const adapterPromises = searchAdapters.map(async (adapter) => {
      const meta = adapter.getPlatform();
      const start = Date.now();

      try {
        const searchPromise = adapter.search(query);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        );

        const products = await Promise.race([searchPromise, timeoutPromise]);
        const latencyMs = Date.now() - start;

        if (products.length > 0) {
          totalScraped += products.length;
          totalNormalized += products.length;

          // Tag products with platform name for in-memory fallback
          const taggedProducts = products.map(p => ({ ...p, _platform: meta.name }));
          allScrapedProducts = [...allScrapedProducts, ...taggedProducts];

          // Sync to DB
          try {
            const syncResult = await this.dbSync.syncScraperResults(adapter, products);
            syncResults.push(syncResult);
          } catch (syncErr: any) {
            this.logger.warn(`DB sync failed for ${meta.name}: ${syncErr.message}`);
            syncResults.push({
              syncedCount: 0, newCanonicalCount: 0, mergedListingsCount: 0,
              priceUpdatesCount: 0, duplicatesSkippedCount: 0,
              failedListingsCount: products.length, syncErrorsCount: 1,
            });
          }

          adapterResults[meta.slug] = {
            platform: meta.name, slug: meta.slug,
            status: 'SUCCESS', productsScraped: products.length,
            productsNormalized: products.length, latencyMs,
          };

          // Update cached health from real execution
          this.registry.updateHealthFromExecution(meta.slug, {
            slug: meta.slug, platform: meta.name,
            status: 'SUCCESS', latencyMs, products: products.length,
            lastChecked: new Date().toISOString(),
          });
        } else {
          adapterResults[meta.slug] = {
            platform: meta.name, slug: meta.slug,
            status: 'ZERO_RESULTS', productsScraped: 0,
            productsNormalized: 0, latencyMs,
          };
          this.registry.updateHealthFromExecution(meta.slug, {
            slug: meta.slug, platform: meta.name,
            status: 'ZERO_RESULTS', latencyMs, products: 0,
            lastChecked: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        const statusCode = this.classifyError(err);

        adapterResults[meta.slug] = {
          platform: meta.name, slug: meta.slug,
          status: statusCode, productsScraped: 0,
          productsNormalized: 0, latencyMs, error: err.message,
        };

        this.registry.updateHealthFromExecution(meta.slug, {
          slug: meta.slug, platform: meta.name,
          status: statusCode, latencyMs, products: 0,
          error: err.message, lastChecked: new Date().toISOString(),
        });

        this.logger.warn(`${meta.name} [${statusCode}]: ${err.message}`);
      }
    });

    await Promise.allSettled(adapterPromises);
    return { totalScraped, totalNormalized, adapterResults, allScrapedProducts, syncResults };
  }

  private classifyError(err: any): PlatformStatusCode {
    const msg = err.message || '';
    if (msg.includes('Timeout')) return 'TIMEOUT';
    if (msg.includes('BLOCKED_BY_ANTI_BOT') || msg.includes('403') || msg.includes('Cloudflare')) return 'BLOCKED_BY_ANTI_BOT';
    if (msg.includes('PARSER_FAILED') || msg.includes('parse')) return 'PARSER_FAILED';
    return 'NETWORK_FAILED';
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
        platform: { name: p._platform || 'Unknown', slug: (p._platform || 'Unknown').toLowerCase().replace(/\s+/g, '') },
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

  private async fetchFromDB(query: string, filters?: any, pagination?: any) {
    return this.searchEngine.execute(query, filters, pagination);
  }
}

// Export a singleton
export const scraperOrchestrator = new ScraperOrchestrator();
