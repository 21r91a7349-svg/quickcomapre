import { CandidateRetriever } from './CandidateRetriever';
import { FilterEngine } from './FilterEngine';
import { RankingEngine } from './RankingEngine';
import { SuggestionEngine } from './SuggestionEngine';
import { QueryNormalizer } from './QueryNormalizer';
import { IntentClassifier } from './IntentClassifier';
import { SearchFilters, SearchPagination, SearchResponse, SuggestionResponse } from './types';

export class SearchEngine {
    private retriever = new CandidateRetriever();
    private filterEngine = new FilterEngine();
    private rankingEngine = new RankingEngine();
    private suggestionEngine = new SuggestionEngine();
    private normalizer = new QueryNormalizer();
    private classifier = new IntentClassifier();

    /**
     * Executes the search pipeline: Candidates -> Filter -> Rank -> Paginate
     */
    async execute(rawQuery: string, filters?: SearchFilters, pagination?: SearchPagination): Promise<SearchResponse> {
        const startTime = Date.now();
        
        // 0. Normalize Query and Classify Intent
        const query = this.normalizer.normalize(rawQuery);
        const intent = this.classifier.classify(query);

        // 1. Retrieve Candidate Pool (Adaptive Retrieval based on Intent)
        let candidates = await this.retriever.getCandidates(query, intent);

        // 2. Extract Facets BEFORE filtering (so UI shows all available options for this query)
        const facets = this.filterEngine.extractFacets(candidates);

        // 3. Filter Candidates
        candidates = this.filterEngine.apply(candidates as any, filters);

        // 4. Rank Candidates
        const ranked = this.rankingEngine.rank(query, intent, candidates);

        // 5. Pagination
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 20;
        const total = ranked.length;
        const pages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedResults = ranked.slice(startIndex, endIndex);

        const isDebugMode = process.env.NODE_ENV !== 'production' || filters?.debug;

        console.log(`[SearchEngine] Pipeline complete in ${Date.now() - startTime}ms. Returned ${paginatedResults.length}/${total} results.`);

        return {
            total,
            page,
            pages,
            limit,
            facets,
            results: paginatedResults.map(p => {
                const res = {
                    id: p.id,
                    display_name: p.display_name,
                    brand: p.brand,
                    quantity: p.quantity,
                    unit: p.unit,
                    canonical_image_url: p.canonical_image_url,
                    searchScore: p.searchScore,
                    intentMatch: p.intentMatch,
                    listings: p.listings.map(l => ({
                        id: l.id,
                        platform: { name: l.platform.name, slug: l.platform.slug },
                        currentPrice: Number(l.currentPrice),
                        originalPrice: l.originalPrice ? Number(l.originalPrice) : null,
                        discount: l.discount ? Number(l.discount) : null,
                        inStock: l.inStock,
                        deliveryTime: l.deliveryTime,
                        productUrl: l.productUrl,
                        lastScrapedAt: l.lastScrapedAt
                    }))
                };
                if (isDebugMode) {
                    (res as any)._debug = p._debug;
                }
                return res as any;
            })
        };
    }

    async suggest(query: string): Promise<SuggestionResponse> {
        return this.suggestionEngine.getSuggestions(query);
    }
}
