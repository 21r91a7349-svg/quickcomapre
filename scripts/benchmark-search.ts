import { scraperOrchestrator } from '../src/scraper';

const TEST_QUERIES = [
  'milk',
  'dairy milk',
  'onion',
  'orange juice',
  'coke',
  'lays',
  'atta'
];

async function runBenchmark() {
  console.log('===========================================================');
  console.log(' QUICKCOMPARE REAL COMPARISON COVERAGE BENCHMARK (PHASE 1-5)');
  console.log('===========================================================\n');

  for (const query of TEST_QUERIES) {
    console.log(`\n>>> Testing Query: "${query}"`);
    const startTime = Date.now();
    try {
      const response = await scraperOrchestrator.getSearchResults(query);
      const duration = Date.now() - startTime;

      console.log(`Query: "${query}" | Results: ${response.total} | Duration: ${duration}ms`);
      console.log(`Platform Execution Status:`, JSON.stringify(response.platformStatus, null, 2));

      if (response.results && response.results.length > 0) {
        console.log(`Top Ranked Product: "${response.results[0].display_name}"`);
        console.log(`  - Category / Brand: ${response.results[0].brand || 'N/A'}`);
        console.log(`  - Search Score: ${response.results[0].searchScore}`);
        console.log(`  - Rank Explanation:`, JSON.stringify(response.results[0].rankExplanation));
        console.log(`  - Listings Count: ${response.results[0].listings?.length || 0}`);
        if (response.results[0].listings) {
          for (const listing of response.results[0].listings) {
            console.log(`     * Platform: ${listing.platform.name} | Price: ₹${listing.currentPrice}`);
          }
        }
      } else {
        console.log(`  - 0 results returned.`);
      }
    } catch (err: any) {
      console.error(`Error benchmarking "${query}":`, err.message);
    }
  }

  console.log('\n===========================================================');
  console.log(' BENCHMARK COMPLETE');
  console.log('===========================================================');
}

runBenchmark().catch(console.error);
