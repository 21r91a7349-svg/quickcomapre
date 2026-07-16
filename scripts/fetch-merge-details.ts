import 'dotenv/config';
import { prisma } from '../src/scraper/core/db';
import fs from 'fs';

async function fetchMergeDetails() {
    const details = JSON.parse(fs.readFileSync('merge_details.json', 'utf8'));
    
    const output = [];
    
    for (const merge of details) {
        const source = await prisma.product.findUnique({
            where: { id: merge.source.id },
            include: { listings: { include: { platform: true } } }
        });
        
        const target = await prisma.product.findUnique({
            where: { id: merge.target.id },
            include: { listings: { include: { platform: true } } }
        });
        
        if (!source || !target) continue;

        output.push({
            Confidence: merge.score,
            Decision: merge.explanation.decision,
            Explanation: merge.explanation,
            Source: {
                id: source.id,
                name: source.display_name,
                brand: source.brand,
                quantity: source.quantity,
                unit: source.unit,
                category: source.category,
                image: source.canonical_image_url,
                listings: source.listings.map(l => ({
                    platform: l.platform.name,
                    url: l.productUrl,
                    price: l.currentPrice
                }))
            },
            Target: {
                id: target.id,
                name: target.display_name,
                brand: target.brand,
                quantity: target.quantity,
                unit: target.unit,
                category: target.category,
                image: target.canonical_image_url,
                listings: target.listings.map(l => ({
                    platform: l.platform.name,
                    url: l.productUrl,
                    price: l.currentPrice
                }))
            }
        });
    }
    
    fs.writeFileSync('merge_manual_review.json', JSON.stringify(output, null, 2));
    console.log('Merge details fetched!');
}

fetchMergeDetails().catch(console.error).finally(() => process.exit(0));
