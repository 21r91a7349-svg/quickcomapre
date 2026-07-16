import 'dotenv/config';
import { prisma } from '../src/scraper/core/db';
import fs from 'fs';

async function calculateMetrics() {
    const products = await prisma.product.findMany({
        include: { listings: true }
    });
    
    // Read dry-run output
    let mergedProductIds = new Set<string>();
    let details: any[] = [];
    if (fs.existsSync('merge_details.json')) {
        details = JSON.parse(fs.readFileSync('merge_details.json', 'utf8'));
        for (const m of details) {
            mergedProductIds.add(m.source.id); // These will be merged INTO target
        }
    }

    const beforeProducts = products.length;
    const afterProducts = beforeProducts - mergedProductIds.size;
    
    let totalListings = 0;
    let productsWith1 = 0;
    let productsWith2 = 0;
    let productsWith3 = 0;
    let crossPlatform = 0;
    
    for (const p of products) {
        if (!mergedProductIds.has(p.id)) {
            // How many listings will this canonical product have?
            // Its own listings + listings from merged products
            let listingsCount = p.listings.length;
            let platforms = new Set<string>();
            for (const l of p.listings) platforms.add(l.platformId);
            
            // Add listings from any product merging into this one
            for (const m of details) {
                if (m.target.id === p.id) {
                    const sourceProduct = products.find(sp => sp.id === m.source.id);
                    if (sourceProduct) {
                        listingsCount += sourceProduct.listings.length;
                        for (const l of sourceProduct.listings) platforms.add(l.platformId);
                    }
                }
            }
            
            totalListings += listingsCount;
            if (listingsCount === 1) productsWith1++;
            if (listingsCount === 2) productsWith2++;
            if (listingsCount >= 3) productsWith3++;
            if (platforms.size > 1) crossPlatform++;
        }
    }
    
    const avgListings = totalListings / afterProducts;
    
    console.log('--- Production Metrics ---');
    console.log(`Average listings per product: ${avgListings.toFixed(2)}`);
    console.log(`Duplicate reduction: ${mergedProductIds.size} products (${((mergedProductIds.size / beforeProducts) * 100).toFixed(1)}%)`);
    console.log(`Products with 1 listing: ${productsWith1}`);
    console.log(`Products with 2 listings: ${productsWith2}`);
    console.log(`Products with 3+ listings: ${productsWith3}`);
    console.log(`Cross-platform merges (2+ platforms): ${crossPlatform}`);
}

calculateMetrics().catch(console.error).finally(() => process.exit(0));
