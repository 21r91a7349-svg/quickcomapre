import { SEARCH_CONFIG } from '../../config/searchRanking';

export type Intent = {
    type: 'brand' | 'category' | 'unknown';
    confidence: number;
    matchedTerm: string;
};

export class IntentClassifier {
    /**
     * Classifies a NORMALIZED query into an intent.
     */
    classify(normalizedQuery: string): Intent {
        if (!normalizedQuery) return { type: 'unknown', confidence: 0, matchedTerm: '' };

        // 1. Check Brands (including Brand Synonyms)
        for (const brand of SEARCH_CONFIG.knownBrands) {
            if (normalizedQuery.includes(brand)) {
                return { type: 'brand', confidence: 0.9, matchedTerm: brand };
            }
        }
        for (const [canonical, synonyms] of Object.entries(SEARCH_CONFIG.synonyms.brand)) {
            if (synonyms.some(s => normalizedQuery.includes(s))) {
                return { type: 'brand', confidence: 0.9, matchedTerm: canonical };
            }
        }

        // 2. Check Categories (including Category Synonyms)
        for (const cat of SEARCH_CONFIG.knownCategories) {
            if (normalizedQuery.includes(cat)) {
                return { type: 'category', confidence: 0.8, matchedTerm: cat };
            }
        }
        for (const [canonical, synonyms] of Object.entries(SEARCH_CONFIG.synonyms.category)) {
            if (synonyms.some(s => normalizedQuery.includes(s))) {
                return { type: 'category', confidence: 0.8, matchedTerm: canonical };
            }
        }

        return { type: 'unknown', confidence: 0, matchedTerm: '' };
    }
}
