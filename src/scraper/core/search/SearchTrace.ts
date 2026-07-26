import { PlatformExecutionResult } from '../../types';

export interface SearchTrace {
  requestId: string;
  query: string;
  timestamp: string;
  
  // Pipeline Stage Metrics
  intent: {
    classifiedCategory: string;
    detectedIntent: string;
    durationMs: number;
  };
  
  cache: {
    status: 'FRESH_HIT' | 'STALE_HIT' | 'MISS' | 'DEGRADED';
    cacheAgeMinutes: number;
    ttlMinutes: number;
    durationMs: number;
  };
  
  database: {
    status: 'CONNECTED' | 'DEGRADED';
    durationMs: number;
    candidatesFound: number;
    error?: string;
  };

  scraper: {
    status: 'SKIPPED' | 'EXECUTED' | 'FAILED';
    durationMs: number;
    adaptersCount: number;
    scrapedCount: number;
    normalizedCount: number;
    adapterResults: Record<string, PlatformExecutionResult>;
  };

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

  totalResponseTimeMs: number;
}

export function createSearchTrace(query: string, requestId?: string): SearchTrace {
  return {
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
    totalResponseTimeMs: 0,
  };
}

export function printSearchTraceSummary(trace: SearchTrace) {
  console.log(`\n=========================================================`);
  console.log(`Request ID: ${trace.requestId}`);
  console.log(`Query: "${trace.query}" [${trace.timestamp}]`);
  console.log(`Intent: ${trace.intent.classifiedCategory} / ${trace.intent.detectedIntent} (${trace.intent.durationMs}ms)`);
  console.log(`Cache: ${trace.cache.status} (Age: ${trace.cache.cacheAgeMinutes.toFixed(1)}m, TTL: ${trace.cache.ttlMinutes}m)`);
  console.log(`Database: ${trace.database.status} (${trace.database.durationMs}ms, ${trace.database.candidatesFound} products)`);
  console.log(`Scraper: ${trace.scraper.status} (${trace.scraper.durationMs}ms, ${trace.scraper.scrapedCount} scraped, ${trace.scraper.normalizedCount} normalized)`);
  
  if (Object.keys(trace.scraper.adapterResults).length > 0) {
    console.log(`Adapters Summary:`);
    for (const [slug, res] of Object.entries(trace.scraper.adapterResults)) {
      console.log(`  - ${res.platform} (${slug}): [${res.status}] Scraped: ${res.productsScraped}, Latency: ${res.latencyMs}ms ${res.error ? `(Error: ${res.error})` : ''}`);
    }
  }

  console.log(`Matching: ${trace.matching.canonicalCount} canonicals, ${trace.matching.newCreatedCount} created, ${trace.matching.listingsMergedCount} merged (${trace.matching.durationMs}ms)`);
  console.log(`Ranking: ${trace.ranking.count} results (${trace.ranking.durationMs}ms)`);
  console.log(`Total Pipeline Time: ${trace.totalResponseTimeMs}ms`);
  console.log(`=========================================================\n`);
}
