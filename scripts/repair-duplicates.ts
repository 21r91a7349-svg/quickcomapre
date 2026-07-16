import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../src/scraper/core/db';
import { ProductMatcher } from '../src/scraper/core/matcher';
import fs from 'fs';

async function generateEmbeddingForProduct(product: any, ai: any) {
    if (!product.embedding && process.env.GEMINI_API_KEY) {
        const str = `${product.brand || ''} ${product.display_name} ${product.quantity || ''} ${product.unit || ''}`.trim();
        try {
            const res = await ai.models.embedContent({ model: 'gemini-embedding-2', contents: str, config: { outputDimensionality: 768 } });
            return res.embeddings?.[0]?.values || null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

// We will use cosine similarity for embeddings in the repair script if available
function cosineSimilarity(vec1: number[], vec2: number[]) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        normA += vec1[i] * vec1[i];
        normB += vec2[i] * vec2[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runRepair() {
    console.log('Starting Repair Script (DRY-RUN MODE)...');
    
    // We instantiate a matcher just to reuse its normalization & guardrail logic via reflection/casting if needed
    // However, TypeScript private methods can't be called easily, so we will use the logic we just wrote.
    const matcher: any = new ProductMatcher(); 
    
    // Fetch all products
    const totalProducts = await prisma.product.count();
    console.log(`Found ${totalProducts} products to process in batches.`);
    
    const BATCH_SIZE = 500;
    
    let summaryCsv = 'SourceID,TargetID,Score,Decision\n';
    let detailsJson: any[] = [];
    let rollbackJson: any = {};
    
    for (let offset = 0; offset < totalProducts; offset += BATCH_SIZE) {
        console.log(`Processing batch ${offset} to ${offset + BATCH_SIZE}...`);
        const batch = await prisma.product.findMany({
            skip: offset,
            take: BATCH_SIZE,
            orderBy: { id: 'asc' },
            include: { listings: true, aliases: true }
        });

        for (const product of batch) {
            // Find candidates using pg_trgm
            const fuzzyCandidates: any[] = await prisma.$queryRaw`
                SELECT id, similarity(normalized_name, ${product.normalized_name}) as trigram_score
                FROM "Product"
                WHERE id != ${product.id}
                  AND similarity(normalized_name, ${product.normalized_name}) > 0.4
                ORDER BY trigram_score DESC
                LIMIT 5
            `;

            if (fuzzyCandidates.length === 0) continue;

            const candidateIds = fuzzyCandidates.map(c => c.id);
            const dbCandidates = await prisma.product.findMany({ where: { id: { in: candidateIds } } });

            let bestScore = -1;
            let bestCandidate: any = null;
            let bestExplanation: any = null;

            for (const candidate of dbCandidates) {
                // Ensure we always merge newer into older
                if (candidate.createdAt > product.createdAt) continue;

                const guard = matcher.checkGuardrails(product as any, candidate);
                if (!guard.pass) continue;

                const trigramScore = fuzzyCandidates.find(c => c.id === candidate.id)?.trigram_score || 0;
                const tokenScore = matcher.calculateTokenOverlap(
                    matcher.normalizeString(product.normalized_name),
                    matcher.normalizeString(candidate.normalized_name)
                );

                let embeddingScore = 0;
                let vec1 = (product as any).embedding as any;
                let vec2 = (candidate as any).embedding as any;

                if (!vec1) {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    vec1 = await generateEmbeddingForProduct(product, ai);
                }
                if (!vec2) {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    vec2 = await generateEmbeddingForProduct(candidate, ai);
                }

                if (vec1 && vec2) {
                    // Quick string-to-array if it comes back as string from raw query
                    const v1 = typeof vec1 === 'string' ? JSON.parse(vec1) : vec1;
                    const v2 = typeof vec2 === 'string' ? JSON.parse(vec2) : vec2;
                    embeddingScore = cosineSimilarity(v1, v2);
                }

                // Use proper weights
                const tokenWeight = 0.35;
                const trigramWeight = 0.35;
                const embeddingWeight = 0.30;
                
                let score = 0;
                if (vec1 && vec2) {
                    score = (tokenScore * tokenWeight) + (trigramScore * trigramWeight) + (embeddingScore * embeddingWeight);
                } else {
                    // Fallback if no API key
                    score = (tokenScore * 0.5) + (trigramScore * 0.5);
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = candidate;
                    bestExplanation = {
                        candidate_generation: { brand: 'PASS', category: 'PASS', quantity: 'PASS', unit: 'PASS' },
                        guardrails: { variant: 'PASS', flavour: 'PASS', packaging: 'PASS' },
                        semantic: { token: tokenScore, trigram: trigramScore, embedding: embeddingScore },
                        decision: score >= 0.88 ? 'AUTO_MERGE' : (score >= 0.70 ? 'REVIEW' : 'REJECT')
                    };
                }
            }

            if (bestCandidate && bestScore >= 0.70) {
                summaryCsv += `${product.id},${bestCandidate.id},${bestScore},MERGE\n`;
                detailsJson.push({
                    score: bestScore,
                    source: { id: product.id, name: product.display_name },
                    target: { id: bestCandidate.id, name: bestCandidate.display_name },
                    explanation: bestExplanation
                });
                
                for (const l of product.listings) {
                    rollbackJson[l.id] = product.id;
                }
            }
        }
    }

    fs.writeFileSync('merge_summary.csv', summaryCsv);
    fs.writeFileSync('merge_details.json', JSON.stringify(detailsJson, null, 2));
    fs.writeFileSync('rollback.json', JSON.stringify(rollbackJson, null, 2));

    // Top 20 Merge Candidates Report
    const sortedMerges = detailsJson.sort((a, b) => b.score - a.score).slice(0, 20);
    let top20Csv = 'Confidence,Product A,Product B,Decision\n';
    for (const m of sortedMerges) {
        top20Csv += `${m.score.toFixed(4)},"${m.source.name}","${m.target.name}",${m.explanation.decision}\n`;
    }
    fs.writeFileSync('top20_merges.csv', top20Csv);

    console.log('Dry-run complete!');
    console.log(`Generated reports for ${detailsJson.length} proposed merges.`);
    console.log('- merge_summary.csv');
    console.log('- merge_details.json');
    console.log('- rollback.json');
    console.log('- top20_merges.csv');
}

runRepair().catch(console.error).finally(() => process.exit(0));
