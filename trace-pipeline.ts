import 'dotenv/config';
import { scraperOrchestrator } from './src/scraper/index';

async function trace() {
  console.log('--- STAGE 1: RUNTIME PIPELINE AUDIT ---');
  console.log('Query: milk');
  
  const start = Date.now();
  const results = await scraperOrchestrator.getSearchResults('milk');
  const duration = Date.now() - start;
  
  console.log(`\nPipeline Execution Time: ${duration}ms`);
  console.log(`Total Products Returned: ${results.results.length}`);
}

trace().catch(console.error);
