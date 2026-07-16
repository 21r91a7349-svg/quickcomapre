import { prisma } from '../db';
import { Intent } from './IntentClassifier';
import { SearchCandidate } from './types';
import { SEARCH_CONFIG } from '../../config/searchRanking';

export class CandidateRetriever {
    async getCandidates(normalizedQuery: string, intent: Intent): Promise<SearchCandidate[]> {
        const startTime = Date.now();
        
        let candidates: any[] = [];
        
        // Form the FTS query
        const ftsTerm = normalizedQuery.split(' ').join(' & ');
        const queryParam = normalizedQuery;

        try {
            // Adaptive Retrieval Strategy
            if (intent.type === 'brand') {
                candidates = await prisma.$queryRaw`
                    SELECT id, 'brand' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE brand ILIKE ${queryParam} OR brand ILIKE ${queryParam + '%'}
                    UNION ALL
                    SELECT id, 'exact' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name = ${queryParam}
                    UNION ALL
                    SELECT id, 'prefix' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name LIKE ${queryParam + '%'}
                    UNION ALL
                    SELECT id, 'trigram' as match_type, 0.0 as match_score, similarity(normalized_name, ${queryParam}) as trigram_score, 0.0 as fts_score FROM "Product" WHERE similarity(normalized_name, ${queryParam}) > 0.3
                    LIMIT ${SEARCH_CONFIG.maxCandidates * 2}
                `;
            } else if (intent.type === 'category') {
                candidates = await prisma.$queryRaw`
                    SELECT id, 'exact' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name = ${queryParam}
                    UNION ALL
                    SELECT id, 'prefix' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name LIKE ${queryParam + '%'}
                    UNION ALL
                    SELECT id, 'fts' as match_type, 1.0 as match_score, 0.0 as trigram_score, ts_rank(to_tsvector('english', display_name), to_tsquery('english', ${ftsTerm})) as fts_score FROM "Product" WHERE to_tsvector('english', display_name) @@ to_tsquery('english', ${ftsTerm})
                    UNION ALL
                    SELECT id, 'trigram' as match_type, 0.0 as match_score, similarity(normalized_name, ${queryParam}) as trigram_score, 0.0 as fts_score FROM "Product" WHERE similarity(normalized_name, ${queryParam}) > 0.3
                    LIMIT ${SEARCH_CONFIG.maxCandidates * 2}
                `;
            } else {
                candidates = await prisma.$queryRaw`
                    SELECT id, 'exact' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name = ${queryParam}
                    UNION ALL
                    SELECT id, 'prefix' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE normalized_name LIKE ${queryParam + '%'}
                    UNION ALL
                    SELECT id, 'brand' as match_type, 1.0 as match_score, 0.0 as trigram_score, 0.0 as fts_score FROM "Product" WHERE brand ILIKE ${queryParam}
                    UNION ALL
                    SELECT id, 'fts' as match_type, 1.0 as match_score, 0.0 as trigram_score, ts_rank(to_tsvector('english', display_name), to_tsquery('english', ${ftsTerm})) as fts_score FROM "Product" WHERE to_tsvector('english', display_name) @@ plainto_tsquery('english', ${queryParam})
                    LIMIT ${SEARCH_CONFIG.maxCandidates * 2}
                `;
                // Guarded typo tolerance: only run trigram if primary branches found nothing
                if (candidates.length === 0) {
                    candidates = await prisma.$queryRaw`
                        SELECT id, 'trigram' as match_type, 0.0 as match_score, similarity(normalized_name, ${queryParam}) as trigram_score, 0.0 as fts_score FROM "Product" WHERE similarity(normalized_name, ${queryParam}) > 0.3
                        LIMIT ${SEARCH_CONFIG.maxCandidates}
                    `;
                }
            }

            // Deduplicate by taking the highest priority match type for each product
            const priority: Record<string, number> = { 'exact': 5, 'brand': 4, 'prefix': 3, 'fts': 2, 'trigram': 1 };
            const dedupedMap = new Map<string, any>();
            
            for (const c of candidates) {
                const existing = dedupedMap.get(c.id);
                if (!existing || priority[c.match_type] > priority[existing.match_type]) {
                    dedupedMap.set(c.id, {
                        id: c.id,
                        matchType: c.match_type,
                        matchScore: Number(c.match_score),
                        trigramScore: Number(c.trigram_score),
                        ftsScore: Number(c.fts_score)
                    });
                }
            }

            // Take top maxCandidates
            const finalIds = Array.from(dedupedMap.keys()).slice(0, SEARCH_CONFIG.maxCandidates);

            if (finalIds.length === 0) return [];

            // Fetch fully populated products for the selected IDs
            const products = await prisma.product.findMany({
                where: { id: { in: finalIds } },
                include: { listings: { include: { platform: true } } }
            });

            const results = products.map(p => ({
                ...p,
                retrievalMeta: dedupedMap.get(p.id)!
            })) as SearchCandidate[];

            console.log(`[CandidateRetriever] Found ${results.length} candidates in ${Date.now() - startTime}ms`);
            return results;
        } catch (error) {
            console.error('[CandidateRetriever] SQL error:', error);
            return [];
        }
    }
}
