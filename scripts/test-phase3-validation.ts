import 'dotenv/config';
import { SearchEngine } from '../src/scraper/core/search/SearchEngine';

async function runValidation() {
    const engine = new SearchEngine();
    const testQueries = [
        'milk', 'rice', 'atta', 'oil', 'coffee', 'tea', 'chocolate', 'maggi', 
        'coke', 'amul', 'sprite', 'thums up', 'pepsi', 'soft drink', 
        'butter', 'ghee', 'paneer', 'curd', 
        'milkk', 'amulll', 'cok', 'ric'
    ];

    let totalQueries = 0;
    let failedTargets = 0;
    let regressionFailures = 0;

    for (const q of testQueries) {
        console.log(`\n================= QUERY: ${q.toUpperCase()} =================`);
        const startTime = Date.now();
        const response = await engine.execute(q, { debug: true });
        const totalLatency = Date.now() - startTime;
        
        console.log(`Total Latency: ${totalLatency}ms`);
        console.log(`Found: ${response.total} products`);
        
        console.log(`\nTop 5 Results:`);
        response.results.slice(0, 5).forEach((p: any, idx) => {
            console.log(`${idx + 1}. [Score: ${p.searchScore.toFixed(2)}] [Intent: ${p.intentMatch}]`);
            console.log(`   ${p.display_name} (${p.quantity}${p.unit}) - ${p.brand || 'No Brand'}`);
            if (p._debug) {
                console.log(`   Debug: Base(${p._debug.base_relevance}) Intent(${p._debug.intent_boost}) Biz(${p._debug.business_rules}) Pop(${p._debug.popularity_score})`);
            }
        });

        totalQueries++;
        if (totalLatency > 120) {
            console.log(`[WARNING] Total Latency ${totalLatency}ms exceeded target of 120ms`);
            failedTargets++;
        }
    }

    console.log(`\n================= VALIDATION SUMMARY =================`);
    console.log(`Queries Run: ${totalQueries}`);
    console.log(`Failed Latency Targets (>120ms): ${failedTargets}`);
}

runValidation().catch(console.error).finally(() => process.exit(0));
