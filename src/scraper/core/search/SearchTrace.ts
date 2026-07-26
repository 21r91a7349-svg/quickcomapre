export interface SearchTrace {
  requestId: string;
  query: string;
  database: {
    status: 'CONNECTED' | 'DEGRADED';
    durationMs: number;
    candidatesFound: number;
    error?: string;
  };
  cache: 'HIT_FRESH' | 'HIT_STALE' | 'MISS' | 'DEGRADED';
  scraper: {
    status: 'SKIPPED' | 'EXECUTED' | 'FAILED';
    durationMs: number;
    adapters: string[];
    scrapedCount: number;
  };
  matching: {
    canonicalCount: number;
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
    database: {
      status: 'CONNECTED',
      durationMs: 0,
      candidatesFound: 0,
    },
    cache: 'MISS',
    scraper: {
      status: 'SKIPPED',
      durationMs: 0,
      adapters: [],
      scrapedCount: 0,
    },
    matching: {
      canonicalCount: 0,
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
  console.log(`Query: ${trace.query}`);
  console.log(`Database: ${trace.database.status === 'CONNECTED' ? '✓ Connected' : '✗ Degraded'} (${trace.database.durationMs} ms)`);
  console.log(`          ${trace.database.candidatesFound} candidate products found`);
  console.log(`Cache: ${trace.cache}`);
  console.log(`Scraper: ${trace.scraper.status} (${trace.scraper.durationMs} ms) [${trace.scraper.adapters.join(', ')}]`);
  console.log(`Matching: ${trace.matching.canonicalCount} canonical products`);
  console.log(`Ranking: ${trace.ranking.count} results (${trace.ranking.durationMs} ms)`);
  console.log(`Total Response Time: ${trace.totalResponseTimeMs} ms`);
  console.log(`=========================================================\n`);
}
