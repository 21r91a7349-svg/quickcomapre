import { Product, Listing, Platform } from '@prisma/client';

export type SearchFilters = {
    brands?: string[];
    platforms?: string[];
    categories?: string[];
    minPrice?: number;
    maxPrice?: number;
    debug?: boolean;
};

export type SearchPagination = {
    page: number;
    limit: number;
};

export type RetrievalMetadata = {
    matchType: 'exact' | 'prefix' | 'brand' | 'fts' | 'trigram';
    matchScore: number;
    trigramScore: number;
    ftsScore: number;
};

export type SearchCandidate = Product & {
    listings: (Listing & { platform: Platform })[];
    retrievalMeta: RetrievalMetadata;
};

export type RankedProduct = SearchCandidate & {
    searchScore: number;
    intentMatch?: 'brand' | 'category' | 'exact' | 'unknown';
    _debug?: any; // Internal Ranking Explanation Object
};

export type SearchResponse = {
    total: number;
    page: number;
    pages: number;
    limit: number;
    results: any[];
    facets: {
        brands: string[];
        categories: string[];
        platforms: string[];
        priceRange: { min: number; max: number };
    };
};

export type SuggestionResponse = {
    brands: string[];
    categories: string[];
    products: string[];
};
