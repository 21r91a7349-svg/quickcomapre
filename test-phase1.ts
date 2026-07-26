import 'dotenv/config';
import { scraperOrchestrator } from './src/scraper/index';

async function verifyPhase1() {
  console.log('--- Phase 3 & 8 Verification: Database Degradation & SearchTrace ---');
  
  const queries = ['milk'];
  
  for (const q of queries) {
    console.log(`\n=========================================================`);
    console.log(`Query: ${q}`);
    console.log(`=========================================================`);
    
    const start = Date.now();
    const results = await scraperOrchestrator.getSearchResults(q);
    console.log(`Finished in ${Date.now() - start}ms`);
    console.log('Response Status:', results.status || 'OK');
    console.log('Response Error:', results.error || 'None');
    console.log('Returned products count:', results.results?.length || 0);
  }
}

verifyPhase1().catch(console.error).finally(() => process.exit(0));
