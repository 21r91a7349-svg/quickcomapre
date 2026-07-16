import { SearchCandidate, SearchFilters } from './types';

export class FilterEngine {
    /**
     * Extracts all available facets from a candidate pool BEFORE filtering is applied.
     * This ensures the UI always shows the full set of available filters for a query.
     */
    extractFacets(candidates: SearchCandidate[]) {
        const brands = new Set<string>();
        const categories = new Set<string>();
        const platforms = new Set<string>();
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        for (const product of candidates) {
            if (product.brand) brands.add(product.brand);
            if (product.category) categories.add(product.category);
            for (const listing of product.listings) {
                platforms.add(listing.platform.name);
                const price = Number(listing.currentPrice);
                if (price < minPrice) minPrice = price;
                if (price > maxPrice) maxPrice = price;
            }
        }

        return {
            brands: Array.from(brands).sort(),
            categories: Array.from(categories).sort(),
            platforms: Array.from(platforms).sort(),
            priceRange: { 
                min: minPrice === Infinity ? 0 : minPrice, 
                max: maxPrice === -Infinity ? 0 : maxPrice 
            }
        };
    }

    apply(candidates: SearchCandidate[], filters?: SearchFilters): SearchCandidate[] {
        if (!filters) return candidates;

        return candidates.filter(product => {
            // Filter by category
            if (filters.categories && filters.categories.length > 0) {
                if (!product.category || !filters.categories.includes(product.category)) return false;
            }

            // Filter by brand
            if (filters.brands && filters.brands.length > 0) {
                if (!product.brand || !filters.brands.includes(product.brand)) return false;
            }

            // Filter by platforms (At least one listing must be on the selected platform)
            if (filters.platforms && filters.platforms.length > 0) {
                const hasPlatform = product.listings.some(l => filters.platforms!.includes(l.platform.name));
                if (!hasPlatform) return false;
            }

            // Filter by price (The best price should fall within the range)
            if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
                if (product.listings.length === 0) return false;
                const bestPrice = Math.min(...product.listings.map(l => Number(l.currentPrice)));
                
                if (filters.minPrice !== undefined && bestPrice < filters.minPrice) return false;
                if (filters.maxPrice !== undefined && bestPrice > filters.maxPrice) return false;
            }

            return true;
        });
    }
}
