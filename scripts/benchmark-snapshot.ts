import 'dotenv/config';
import { SearchEngine } from '../src/scraper/core/search/SearchEngine';

async function runBenchmark() {
    const engine = new SearchEngine();
    const testQueries = ['milk', 'rice', 'oil', 'atta', 'amul', 'coke', 'maggi', 'coffee', 'paneer', 'chocolate'];

    console.log("Query | Candidate Count | Latency | Ranking Time | Total API | Result Count");
    console.log("---|---|---|---|---|---");

    for (const q of testQueries) {
        const startTime = Date.now();
        const response = await engine.execute(q, { debug: true });
        const totalLatency = Date.now() - startTime;
        
        // Approximation: We don't have direct access to internal timings from outside,
        // but we can assume total API time is the totalLatency.
        // We can just print the metrics we have.
        // Wait, SearchEngine prints logs. Let's capture stdout or just rely on total latency.
        // Actually I'll just print it and we can fill in the values.
        console.log(`${q} | ? | ? | ? | ${totalLatency}ms | ${response.total}`);
    }
}

runBenchmark().catch(console.error).finally(() => process.exit(0));
