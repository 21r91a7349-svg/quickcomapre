import { Intent } from './IntentClassifier';
import { RankedProduct, SearchCandidate } from './types';
import { SEARCH_CONFIG } from '../../config/searchRanking';

export interface RankExplanation {
  categoryBonus: number;       // +500 for matching intent category
  categoryPenalty: number;     // -400 for category/type mismatch (e.g. chips on "onion")
  exactMatchBonus: number;    // +300 for exact product title match
  brandBonus: number;         // +150 for matching brand
  coverageBonus: number;      // +120 for multi-platform availability
  textSimilarityScore: number;// Base trigram/FTS similarity score
  finalScore: number;         // Total calculated score
}

export class RankingEngine {
    /**
     * Ranks a pre-filtered list of candidates based on a multi-tier explainable scoring pipeline.
     */
    rank(normalizedQuery: string, intent: Intent, candidates: SearchCandidate[]): RankedProduct[] {
        const startTime = Date.now();
        const q = normalizedQuery.trim().toLowerCase();
        
        const ranked = candidates.map(product => {
            const { matchType, trigramScore, ftsScore } = product.retrievalMeta;
            const normalizedName = (product.normalized_name || '').toLowerCase();
            const displayName = (product.display_name || '').toLowerCase();
            const category = (product.category || 'OTHER').toUpperCase();
            const brand = (product.brand || '').toLowerCase();

            // 1. Text Similarity Score
            let textSimilarityScore = 0;
            if (matchType === 'exact') textSimilarityScore = SEARCH_CONFIG.weights.exactMatchBoost;
            else if (matchType === 'prefix') textSimilarityScore = SEARCH_CONFIG.weights.prefixMatchBoost;
            else if (matchType === 'brand') textSimilarityScore = SEARCH_CONFIG.weights.exactMatchBoost;
            else if (matchType === 'fts') textSimilarityScore = SEARCH_CONFIG.weights.ftsBaseBoost + (ftsScore * 10);
            else if (matchType === 'trigram') textSimilarityScore = SEARCH_CONFIG.weights.trigramBaseBoost * trigramScore;

            // 2. Exact Title Match Bonus
            let exactMatchBonus = 0;
            if (normalizedName === q || displayName === q) {
                exactMatchBonus = 300;
            }

            // 3. Category Intent Bonus vs Penalty
            let categoryBonus = 0;
            let categoryPenalty = 0;

            if (intent.targetCategory === 'FRESH_PRODUCE') {
                if (normalizedName.includes('onion') && !normalizedName.includes('chip') && !normalizedName.includes('wafer') && !normalizedName.includes('namkeen')) {
                    categoryBonus = 500;
                } else if (normalizedName.includes('chip') || normalizedName.includes('wafer') || normalizedName.includes('snack')) {
                    categoryPenalty = -400;
                }
            } else if (intent.targetCategory === 'DAIRY') {
                if ((normalizedName.includes('milk') || normalizedName.includes('dahi') || normalizedName.includes('paneer')) && !normalizedName.includes('chocolate') && !normalizedName.includes('cadbury')) {
                    categoryBonus = 500;
                } else if (normalizedName.includes('chocolate') || normalizedName.includes('cadbury')) {
                    categoryPenalty = -400;
                }
            } else if (intent.targetCategory === 'CONFECTIONERY') {
                if (normalizedName.includes('cadbury') || normalizedName.includes('chocolate') || normalizedName.includes('dairy milk')) {
                    categoryBonus = 500;
                }
            } else if (intent.targetCategory === 'BEVERAGES') {
                if (category === 'BEVERAGES' || normalizedName.includes('juice') || normalizedName.includes('coke') || normalizedName.includes('drink')) {
                    categoryBonus = 500;
                }
            } else if (intent.targetCategory === 'SNACKS') {
                if (category === 'SNACKS' || normalizedName.includes('lays') || normalizedName.includes('chip')) {
                    categoryBonus = 500;
                }
            }

            // 4. Brand Match Bonus
            let brandBonus = 0;
            if (brand && intent.matchedTerm && (brand.includes(intent.matchedTerm) || intent.matchedTerm.includes(brand))) {
                brandBonus = 150;
            }

            // 5. Platform Coverage Bonus
            const uniquePlatforms = new Set(product.listings.map(l => l.platform.name)).size;
            const coverageBonus = uniquePlatforms * 60; // 60 per platform

            // Final Total Score calculation
            const finalScore = textSimilarityScore + exactMatchBonus + categoryBonus + categoryPenalty + brandBonus + coverageBonus;

            const rankExplanation: RankExplanation = {
                categoryBonus,
                categoryPenalty,
                exactMatchBonus,
                brandBonus,
                coverageBonus,
                textSimilarityScore: Math.round(textSimilarityScore),
                finalScore: Math.round(finalScore)
            };

            return {
                ...product,
                searchScore: finalScore,
                intentMatch: intent.type,
                _debug: {
                    match_type: matchType,
                    rankExplanation
                }
            } as RankedProduct;
        });

        // Sort descending by searchScore
        ranked.sort((a, b) => b.searchScore - a.searchScore);

        console.log(`[RankingEngine] Ranked ${ranked.length} products in ${Date.now() - startTime}ms`);
        return ranked;
    }
}
