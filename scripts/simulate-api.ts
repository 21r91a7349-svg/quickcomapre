import 'dotenv/config';
import { ScraperOrchestrator } from '../src/scraper';
import fs from 'fs';

async function simulateSearch() {
    const orchestrator = new ScraperOrchestrator();
    const details = JSON.parse(fs.readFileSync('merge_details.json', 'utf8'));

    const queries = ['milk', 'rice', 'coke', 'maggi', 'onion', 'amul'];
    
    let totalBefore = 0;
    let totalAfter = 0;

    const output: Record<string, any> = {};

    for (const q of queries) {
        console.log(`\nSearching for: ${q}...`);
        
        // This hits the DB and scrapers (live search)
        const response: any = await orchestrator.getSearchResults(q);
        const results = response.results || response;
        const beforeCount = results.length;
        
        // In-memory merge simulation
        const afterResults = [...results];
        
        for (const merge of details) {
            const sourceIdx = afterResults.findIndex(p => p.id === merge.source.id);
            const targetIdx = afterResults.findIndex(p => p.id === merge.target.id);
            
            if (sourceIdx !== -1 && targetIdx !== -1) {
                console.log(`[SIMULATED MERGE] ${afterResults[sourceIdx].display_name} -> ${afterResults[targetIdx].display_name}`);
                afterResults[targetIdx].listings.push(...afterResults[sourceIdx].listings);
                // Remove the source
                afterResults.splice(sourceIdx, 1);
            }
        }
        
        const afterCount = afterResults.length;
        totalBefore += beforeCount;
        totalAfter += afterCount;

        output[q] = {
            beforeCount,
            afterCount,
            products: afterResults.map(p => ({
                id: p.id,
                name: p.display_name,
                brand: p.brand,
                quantity: p.quantity,
                unit: p.unit,
                listings: p.listings.length,
                platforms: Array.from(new Set(p.listings.map((l: any) => l.platformId)))
            }))
        };
        
        console.log(`Results: ${beforeCount} -> ${afterCount} products.`);
    }
    
    fs.writeFileSync('simulate_api_output.json', JSON.stringify(output, null, 2));
    console.log(`\nSimulation complete! Duplicate reduction: ${totalBefore} -> ${totalAfter}`);
}

simulateSearch().catch(console.error).finally(() => process.exit(0));
