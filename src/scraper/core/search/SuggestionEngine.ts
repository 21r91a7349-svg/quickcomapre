import { prisma } from '../db';
import { SuggestionResponse } from './types';
import { SEARCH_CONFIG } from '../../config/searchRanking';

export class SuggestionEngine {
    async getSuggestions(query: string): Promise<SuggestionResponse> {
        if (!query || query.length < 2) {
            return { brands: [], categories: [], products: [] };
        }

        const normalizedQuery = query.toLowerCase().trim();

        // 1. Match configured categories
        const matchedCategories = SEARCH_CONFIG.knownCategories
            .filter(c => c.startsWith(normalizedQuery))
            .slice(0, 3);

        // 2. Match configured brands
        const matchedBrands = SEARCH_CONFIG.knownBrands
            .filter(b => b.startsWith(normalizedQuery))
            .slice(0, 3);

        // 3. Match top product names from DB (using fast prefix match)
        const dbProducts: { display_name: string }[] = await prisma.$queryRaw`
            SELECT DISTINCT display_name
            FROM "Product"
            WHERE display_name ILIKE ${normalizedQuery + '%'}
            LIMIT 5
        `;

        return {
            categories: matchedCategories,
            brands: matchedBrands,
            products: dbProducts.map(p => p.display_name)
        };
    }
}
