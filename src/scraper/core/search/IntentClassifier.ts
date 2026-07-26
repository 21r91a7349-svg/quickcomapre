import { SEARCH_CONFIG } from '../../config/searchRanking';

export type IntentCategory = 'FRESH_PRODUCE' | 'DAIRY' | 'BEVERAGES' | 'SNACKS' | 'CONFECTIONERY' | 'GROCERY' | 'GENERAL';

export type Intent = {
    type: 'brand' | 'category' | 'exact' | 'unknown';
    confidence: number;
    matchedTerm: string;
    targetCategory: IntentCategory;
    isExactBrandQuery?: boolean;
};

export class IntentClassifier {
    /**
     * Classifies a NORMALIZED query into a structured Intent object.
     */
    classify(normalizedQuery: string): Intent {
        if (!normalizedQuery) {
            return { type: 'unknown', confidence: 0, matchedTerm: '', targetCategory: 'GENERAL' };
        }

        const q = normalizedQuery.trim().toLowerCase();

        // 1. Special Query Intent Disambiguation
        if (q === 'dairy milk' || q.includes('cadbury dairy milk')) {
            return {
                type: 'brand',
                confidence: 0.95,
                matchedTerm: 'cadbury dairy milk',
                targetCategory: 'CONFECTIONERY',
                isExactBrandQuery: true
            };
        }

        if (q === 'milk' || q === 'toned milk' || q === 'cow milk' || q === 'full cream milk') {
            return {
                type: 'category',
                confidence: 0.95,
                matchedTerm: 'milk',
                targetCategory: 'DAIRY'
            };
        }

        if (q === 'onion' || q === 'onions' || q === 'pyaz' || q === 'red onion') {
            return {
                type: 'category',
                confidence: 0.95,
                matchedTerm: 'onion',
                targetCategory: 'FRESH_PRODUCE'
            };
        }

        if (q.includes('orange juice') || q === 'juice') {
            return {
                type: 'category',
                confidence: 0.90,
                matchedTerm: 'orange juice',
                targetCategory: 'BEVERAGES'
            };
        }

        if (q === 'lays' || q.includes('chips') || q.includes('wafer')) {
            return {
                type: 'category',
                confidence: 0.90,
                matchedTerm: 'lays',
                targetCategory: 'SNACKS'
            };
        }

        if (q === 'atta' || q === 'wheat flour' || q === 'chakki fresh atta') {
            return {
                type: 'category',
                confidence: 0.90,
                matchedTerm: 'atta',
                targetCategory: 'GROCERY'
            };
        }

        if (q === 'coke' || q === 'coca cola' || q === 'pepsi') {
            return {
                type: 'brand',
                confidence: 0.95,
                matchedTerm: q,
                targetCategory: 'BEVERAGES'
            };
        }

        // 2. Known Brands Lookup
        for (const brand of SEARCH_CONFIG.knownBrands) {
            if (q.includes(brand)) {
                return { type: 'brand', confidence: 0.9, matchedTerm: brand, targetCategory: 'GENERAL' };
            }
        }

        // 3. Known Categories Lookup
        for (const cat of SEARCH_CONFIG.knownCategories) {
            if (q.includes(cat)) {
                return { type: 'category', confidence: 0.8, matchedTerm: cat, targetCategory: 'GROCERY' };
            }
        }

        return { type: 'unknown', confidence: 0.5, matchedTerm: q, targetCategory: 'GENERAL' };
    }
}
