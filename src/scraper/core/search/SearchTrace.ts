import { PlatformExecutionResult, PlatformStatusCode, DbSyncResult } from '../../types';

export interface SearchTrace {
  traceVersion: number;
  requestId: string;
  query: string;
  timestamp: string;
  
  // Intent Classification
  intent: {
    classifiedCategory: string;
    detectedIntent: string;
    durationMs: number;
  };
  
  // Cache Decision
  cache: {
    status: 'FRESH_HIT' | 'STALE_HIT' | 'MISS' | 'DEGRADED';
    cacheAgeMinutes: number;
    ttlMinutes: number;
    durationMs: number;
  };
  
  // Database Connection
  database: {
    status: 'CONNECTED' | 'DEGRADED';
    durationMs: number;
    candidatesFound: number;
    error?: string;
  };

  // Adapter Execution
  scraper: {
    status: 'SKIPPED' | 'EXECUTED' | 'FAILED';
    durationMs: number;
    adaptersCount: number;
    scrapedCount: number;
    normalizedCount: number;
    adapterResults: Record<string, PlatformExecutionResult>;
  };

  // DB Sync Metrics (detailed)
  dbSync: {
    durationMs: number;
    scrapedCount: number;
    parsedCount: number;
    normalizedCount: number;
    matchedCount: number;
    newCanonicalCount: number;
    mergedListingsCount: number;
    priceUpdatesCount: number;
    duplicatesSkippedCount: number;
    failedListingsCount: number;
    syncErrorsCount: number;
  };

  // Matching & Ranking
  matching: {
    canonicalCount: number;
    newCreatedCount: number;
    listingsMergedCount: number;
    durationMs: number;
  };

  ranking: {
    count: number;
    durationMs: number;
  };

  // Phase Timestamps
  timing: {
    cacheLookupMs: number;
    intentClassificationMs: number;
    adapterExecutionMs: number;
    normalizationMs: number;
    matcherMs: number;
    dbSyncMs: number;
    dbRequeryMs: number;
    rerankMs: number;
    totalLatencyMs: number;
  };

  totalResponseTimeMs: number;
}

export function createSearchTrace(query: string, requestId?: string): SearchTrace {
  return {
    traceVersion: 2,
    requestId: requestId || `req-${Math.random().toString(36).substring(2, 10)}`,
    query,
    timestamp: new Date().toISOString(),
    intent: {
      classifiedCategory: 'GENERAL',
      detectedIntent: 'ANY',
      durationMs: 0,
    },
    cache: {
      status: 'MISS',
      cacheAgeMinutes: 0,
      ttlMinutes: 30,
      durationMs: 0,
    },
    database: {
      status: 'CONNECTED',
      durationMs: 0,
      candidatesFound: 0,
    },
    scraper: {
      status: 'SKIPPED',
      durationMs: 0,
      adaptersCount: 0,
      scrapedCount: 0,
      normalizedCount: 0,
      adapterResults: {},
    },
    dbSync: {
      durationMs: 0,
      scrapedCount: 0,
      parsedCount: 0,
      normalizedCount: 0,
      matchedCount: 0,
      newCanonicalCount: 0,
      mergedListingsCount: 0,
      priceUpdatesCount: 0,
      duplicatesSkippedCount: 0,
      failedListingsCount: 0,
      syncErrorsCount: 0,
    },
    matching: {
      canonicalCount: 0,
      newCreatedCount: 0,
      listingsMergedCount: 0,
      durationMs: 0,
    },
    ranking: {
      count: 0,
      durationMs: 0,
    },
    timing: {
      cacheLookupMs: 0,
      intentClassificationMs: 0,
      adapterExecutionMs: 0,
      normalizationMs: 0,
      matcherMs: 0,
      dbSyncMs: 0,
      dbRequeryMs: 0,
      rerankMs: 0,
      totalLatencyMs: 0,
    },
    totalResponseTimeMs: 0,
  };
}

/**
 * Derives platform status from SearchTrace adapter execution results.
 * This is the ONLY source of truth for platform statuses in the API response.
 */
export function derivePlatformStatus(trace: SearchTrace, allRegisteredSlugs: { slug: string; name: string; isEnabled: boolean }[]): Record<string, { status: PlatformStatusCode; products: number; latencyMs: number; error?: string }> {
  const result: Record<string, { status: PlatformStatusCode; products: number; latencyMs: number; error?: string }> = {};

  for (const reg of allRegisteredSlugs) {
    const adapterResult = trace.scraper.adapterResults[reg.slug];

    if (adapterResult) {
      // Status derived from actual execution
      result[reg.name] = {
        status: adapterResult.status,
        products: adapterResult.productsScraped,
        latencyMs: adapterResult.latencyMs,
        error: adapterResult.error,
      };
    } else if (trace.cache.status === 'FRESH_HIT') {
      // Adapters skipped due to fresh cache — never report SUCCESS
      result[reg.name] = {
        status: 'SKIPPED_CACHE_FRESH',
        products: 0,
        latencyMs: 0,
      };
    } else if (!reg.isEnabled) {
      result[reg.name] = {
        status: 'DISABLED',
        products: 0,
        latencyMs: 0,
      };
    } else {
      // Adapter was registered but somehow never executed
      result[reg.name] = {
        status: 'NETWORK_FAILED',
        products: 0,
        latencyMs: 0,
        error: 'Adapter registered but did not execute',
      };
    }
  }

  return result;
}

export function printSearchTraceSummary(trace: SearchTrace) {
  console.log(`\n=========================================================`);
  console.log(`[Trace v${trace.traceVersion}] Request: ${trace.requestId}`);
  console.log(`Query: "${trace.query}" [${trace.timestamp}]`);
  console.log(`Intent: ${trace.intent.classifiedCategory} / ${trace.intent.detectedIntent} (${trace.intent.durationMs}ms)`);
  console.log(`Cache: ${trace.cache.status} (Age: ${trace.cache.cacheAgeMinutes.toFixed(1)}m, TTL: ${trace.cache.ttlMinutes}m, Lookup: ${trace.timing.cacheLookupMs}ms)`);
  console.log(`Database: ${trace.database.status} (${trace.database.durationMs}ms, ${trace.database.candidatesFound} candidates)`);
  console.log(`Scraper: ${trace.scraper.status} (${trace.timing.adapterExecutionMs}ms, ${trace.scraper.scrapedCount} scraped, ${trace.scraper.normalizedCount} normalized)`);
  
  if (Object.keys(trace.scraper.adapterResults).length > 0) {
    console.log(`Adapter Execution:`);
    for (const [slug, res] of Object.entries(trace.scraper.adapterResults)) {
      console.log(`  ${res.platform} (${slug}): [${res.status}] ${res.productsScraped} products, ${res.latencyMs}ms${res.error ? ` — ${res.error}` : ''}`);
    }
  }

  if (trace.dbSync.scrapedCount > 0 || trace.dbSync.syncErrorsCount > 0) {
    console.log(`DB Sync: ${trace.dbSync.durationMs}ms | scraped=${trace.dbSync.scrapedCount} matched=${trace.dbSync.matchedCount} new=${trace.dbSync.newCanonicalCount} merged=${trace.dbSync.mergedListingsCount} prices=${trace.dbSync.priceUpdatesCount} failed=${trace.dbSync.failedListingsCount} errors=${trace.dbSync.syncErrorsCount}`);
  }

  console.log(`Matching: ${trace.matching.canonicalCount} canonicals (${trace.matching.durationMs}ms)`);
  console.log(`Ranking: ${trace.ranking.count} results (${trace.ranking.durationMs}ms)`);
  console.log(`Timing: cache=${trace.timing.cacheLookupMs}ms adapters=${trace.timing.adapterExecutionMs}ms sync=${trace.timing.dbSyncMs}ms requery=${trace.timing.dbRequeryMs}ms rank=${trace.timing.rerankMs}ms`);
  console.log(`Total: ${trace.totalResponseTimeMs}ms`);
  console.log(`=========================================================\n`);
}
