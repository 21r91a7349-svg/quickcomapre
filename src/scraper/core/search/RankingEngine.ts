import { Intent } from './IntentClassifier';
import { RankedProduct, SearchCandidate } from './types';
import { SEARCH_CONFIG } from '../../config/searchRanking';

export class RankingEngine {
    /**
     * Ranks a pre-filtered list of candidates based on a 4-stage pipeline.
     */
    rank(normalizedQuery: string, intent: Intent, candidates: SearchCandidate[]): RankedProduct[] {
        const startTime = Date.now();
        
        const ranked = candidates.map(product => {
            const { matchType, trigramScore, ftsScore } = product.retrievalMeta;
            
            // Stage 1: Base Relevance
            let baseRelevance = 0;
            if (matchType === 'exact') baseRelevance = SEARCH_CONFIG.weights.exactMatchBoost;
            else if (matchType === 'prefix') baseRelevance = SEARCH_CONFIG.weights.prefixMatchBoost;
            else if (matchType === 'brand') baseRelevance = SEARCH_CONFIG.weights.exactMatchBoost; // Exact brand match
            else if (matchType === 'fts') baseRelevance = SEARCH_CONFIG.weights.ftsBaseBoost + (ftsScore * 10);
            else if (matchType === 'trigram') baseRelevance = SEARCH_CONFIG.weights.trigramBaseBoost * trigramScore;

            // Stage 2: Intent Boost
            let intentBoost = 0;
            const normalizedName = product.normalized_name;
            if (intent.type === 'category' && product.category === 'OTHER' && normalizedName.includes(intent.matchedTerm)) {
                intentBoost = SEARCH_CONFIG.weights.categoryIntentBoost;
            } else if (intent.type === 'brand' && product.brand?.toLowerCase() === intent.matchedTerm) {
                intentBoost = SEARCH_CONFIG.weights.brandIntentBoost;
            }

            // Stage 3: Business Rules
            let businessRules = 0;
            const isStaple = SEARCH_CONFIG.staples.some(s => normalizedName.includes(s));
            if (isStaple) businessRules += SEARCH_CONFIG.weights.stapleBoost;

            const isNiche = SEARCH_CONFIG.nicheKeywords.some(n => normalizedName.includes(n) && !normalizedQuery.includes(n));
            if (isNiche) businessRules += SEARCH_CONFIG.weights.nichePenalty;

            // Stage 4: Popularity (Tie breakers)
            const uniquePlatforms = new Set(product.listings.map(l => l.platform.name)).size;
            const popularityScore = uniquePlatforms * SEARCH_CONFIG.weights.listingCountBoost;
            const totalPopularity = popularityScore + SEARCH_CONFIG.weights.searchFrequencyBoost + SEARCH_CONFIG.weights.ctrBoost + SEARCH_CONFIG.weights.conversionBoost;

            // Final Score
            const totalScore = baseRelevance + intentBoost + businessRules + totalPopularity;

            return {
                ...product,
                searchScore: totalScore,
                intentMatch: intent.type,
                _debug: {
                    match_type: matchType,
                    base_relevance: baseRelevance,
                    intent_boost: intentBoost,
                    business_rules: businessRules,
                    popularity_score: totalPopularity,
                    total_score: totalScore
                }
            } as RankedProduct;
        });

        // Sort descending by searchScore
        ranked.sort((a, b) => b.searchScore - a.searchScore);

        console.log(`[RankingEngine] Ranked ${ranked.length} products in ${Date.now() - startTime}ms`);
        return ranked;
    }
}
