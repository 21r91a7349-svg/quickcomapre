export class QueryNormalizer {
    /**
     * Normalizes a raw search query for downstream classifiers and retrieval.
     * Handles:
     * - lowercase & trim
     * - collapsing multiple spaces
     * - removing duplicate punctuation
     * - generic synonym conversions (& -> and)
     */
    normalize(rawQuery: string): string {
        if (!rawQuery) return '';

        let q = rawQuery.toLowerCase().trim();

        // Convert generic synonyms BEFORE punctuation removal so '&' -> 'and'
        q = q.replace(/&/g, ' and ');
        q = q.replace(/'n'/g, ' and ');

        // Remove unnecessary punctuation (keep basic alphanumeric and space)
        q = q.replace(/[^\w\s-]/g, ' ');

        // Collapse multiple spaces
        q = q.replace(/\s+/g, ' ').trim();

        return q;
    }
}
