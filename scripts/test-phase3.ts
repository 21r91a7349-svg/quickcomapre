import 'dotenv/config';
import { SearchEngine } from '../src/scraper/core/search/SearchEngine';

async function testSearchEngine() {
    const engine = new SearchEngine();
    const testQueries = ['milk', 'rice', 'atta', 'oil', 'onion', 'coke', 'maggi', 'amul'];

    for (const q of testQueries) {
        console.log(`\n================= QUERY: ${q.toUpperCase()} =================`);
        const startTime = Date.now();
        const response = await engine.execute(q);
        
        console.log(`Latency: ${Date.now() - startTime}ms`);
        console.log(`Found: ${response.total} products`);
        console.log(`Facets: Brands(${response.facets.brands.length}), Platforms(${response.facets.platforms.length})`);
        
        console.log(`\nTop 5 Results:`);
        response.results.slice(0, 5).forEach((p, idx) => {
            console.log(`${idx + 1}. [Score: ${p.searchScore.toFixed(2)}] [Intent: ${p.intentMatch}]`);
            console.log(`   ${p.display_name} (${p.quantity}${p.unit}) - ${p.brand || 'No Brand'}`);
            console.log(`   Listings: ${p.listings.length} (${p.listings.map((l:any) => l.platform.name).join(', ')})`);
        });
    }
}

testSearchEngine().catch(console.error).finally(() => process.exit(0));
