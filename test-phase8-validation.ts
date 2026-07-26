import { scraperOrchestrator } from './src/scraper/index';

async function validatePhase8Pipeline() {
  console.log('=========================================================');
  console.log('PHASE 8: End-to-End Search Pipeline Validation');
  console.log('=========================================================\n');

  const testQueries = [
    'milk',
    'rice',
    'atta',
    'coke',
    'amul',
    'lays',
    'sprite',
    'surf excel',
    'onion',
    'tomato'
  ];

  const summaryReport: any[] = [];

  for (const q of testQueries) {
    const startTime = Date.now();
    console.log(`\n---------------------------------------------------------`);
    console.log(`Testing Query: "${q}"`);
    console.log(`---------------------------------------------------------`);

    try {
      const response = await scraperOrchestrator.getSearchResults(q);
      const totalTime = Date.now() - startTime;
      
      const record = {
        query: q,
        status: response.status || 'OK',
        totalProducts: response.total || response.results?.length || 0,
        cacheStatus: response.trace?.cache || 'N/A',
        dbStatus: response.trace?.database?.status || 'N/A',
        scraperStatus: response.trace?.scraper?.status || 'N/A',
        totalLatencyMs: totalTime,
      };

      summaryReport.push(record);
      console.log(`Result:`, record);
    } catch (err: any) {
      console.error(`Query "${q}" FAILED:`, err.message);
      summaryReport.push({
        query: q,
        status: 'FAILED',
        error: err.message,
        totalLatencyMs: Date.now() - startTime
      });
    }
  }

  console.log('\n=========================================================');
  console.log('SUMMARY PIPELINE REPORT');
  console.log('=========================================================');
  console.table(summaryReport);
}

validatePhase8Pipeline().catch(console.error).finally(() => process.exit(0));
