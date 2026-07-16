# Search Architecture

This document describes the QuickCompare canonical matching and search engine infrastructure. As of the end of Phase 3, this algorithm is officially **Frozen** and should be treated as stable infrastructure.

## Search Pipeline

The search pipeline executes sequentially in a strict component-based architecture via `SearchEngine.ts`:

1. **Query Normalization** (`QueryNormalizer.ts`)
2. **Intent Classification** (`IntentClassifier.ts`)
3. **Candidate Retrieval** (`CandidateRetriever.ts`)
4. **Facet Extraction** (`FilterEngine.ts`)
5. **Filter Application** (`FilterEngine.ts`)
6. **Ranking Engine** (`RankingEngine.ts`)
7. **Pagination** (`SearchEngine.ts`)

## Query Normalization

Before any scoring or retrieval occurs, the raw query passes through `QueryNormalizer`:
- Downcases all characters.
- Trims leading/trailing whitespace.
- Collapses multiple internal spaces into a single space.
- Removes duplicate and special punctuation while preserving alphanumeric characters and hyphens.
- Unrolls generic abbreviations (e.g., converting `&` and `'n'` into `and`).

## Synonym System

A static synonym dictionary resides in `src/scraper/config/searchRanking.ts`. It categorizes aliases explicitly to avoid generic token bleed:
- **Brand Synonyms**: Maps aliases to primary brand entities (e.g., `coke` -> `coca cola`).
- **Category Synonyms**: Maps aliases to primary category entities (e.g., `atta` -> `wheat flour`).
- **Generic Synonyms**: (Processed at the normalization stage) e.g., `&` -> `and`.

## Intent Classification

The `IntentClassifier` runs the normalized query against the Synonym Dictionaries and Known Tokens to extract structured intent:
- `brand`: E.g., user explicitly queried "amul" or "coke".
- `category`: E.g., user explicitly queried "milk" or "atta".
- `unknown`: No explicit intent matched.

This prevents the engine from treating a query for "amul" identically to a query for generic "milk".

## Candidate Retrieval

Candidate retrieval operates via an adaptive Hybrid `UNION ALL` SQL architecture in `CandidateRetriever.ts`.

Instead of running all `OR` logic simultaneously and blowing up query times, the SQL branches adaptively trigger based on the classified Intent.

The retrieval engine projects specific `match_type` and raw SQL scores (e.g., `fts_score`, `trigram_score`) directly into the application layer for ranking. The branches in priority order:
1. `exact`: `normalized_name = $query`
2. `brand`: `brand ILIKE $query`
3. `prefix`: `normalized_name LIKE $query%`
4. `fts`: Full Text Search via `to_tsvector`
5. `trigram`: Fuzzy Search via `similarity > 0.3`

**Typo Handling Guardrail**: 
The `trigram` fallback branch is intentionally guarded for `unknown` queries. It only executes if the Exact, Prefix, Brand, and FTS branches yield 0 results. This guarantees that typos are handled robustly without polluting high-confidence categorical queries with fuzzy edge-cases.

## Ranking Stages

The `RankingEngine` processes the retrieved candidates in a deterministic 4-stage pipeline:

1. **Stage 1: Base Relevance**
   Consumes the SQL metadata (`match_type`, `fts_score`, `trigram_score`) and assigns a dominant base score based on structural similarity. (e.g. `exact` = 100 points, `prefix` = 80 points).
2. **Stage 2: Intent Boost**
   Checks if the product matches the extracted Intent (e.g. providing a +20 boost if the user searched for the category 'milk' and the product is actually classified as the category 'milk').
3. **Stage 3: Business Rules**
   Injects semantic overrides. For example, boosting staple variants (e.g. "Toned Milk") and penalizing niche variants (e.g. "Rose Milk") unless explicitly requested.
4. **Stage 4: Popularity (Tiebreaker)**
   Leverages the total number of unique platforms a product is available on as a minor tiebreaker, preventing obscure 1-platform items from tying with heavily sourced ubiquitous items.

## Explainability

Every single product returned by the API can include an internal `_debug` payload tracing exactly how its score was calculated:
```json
"_debug": {
    "match_type": "exact",
    "base_relevance": 100,
    "intent_boost": 20,
    "business_rules": 10,
    "popularity_score": 3,
    "total_score": 133
}
```
*Note: This object is automatically stripped by `SearchEngine.ts` in production environments unless `?debug=true` is explicitly provided in the API request.*

## RC-3 Database Roadmap

While the algorithmic relevance of the Search Engine is frozen, **database performance is pending optimization**.

Currently, retrieval queries rely on `Seq Scan` (Sequential Scans), pushing API latencies above 700ms.

### Performance Budgets
- **Retrieval Goal**: < 50ms
- **Ranking Goal**: < 5ms
- **Total API Response Goal**: < 120ms

### Priority 1: Required Indexes
The following indexes must be created in PostgreSQL during RC-3 to satisfy the performance budgets:
1. **B-Tree Pattern Ops**: `CREATE INDEX idx_product_normalized_name_pattern ON "Product" (normalized_name varchar_pattern_ops);`
2. **FTS GIN Index**: `CREATE INDEX idx_product_fts ON "Product" USING GIN (to_tsvector('english', display_name));`
3. **Trigram GIN Index**: `CREATE INDEX idx_product_trigram ON "Product" USING GIN (normalized_name gin_trgm_ops);`

### Priority 2: Materialized SearchIndex
Abstracting the `Product` table into a dedicated `SearchIndex` table (or Materialized View) to pre-compute metadata and flatten relations for scale.

## Phase 3 Benchmark Snapshots

The following snapshot metrics were recorded at the exact moment the Search Algorithm was frozen. They serve as regression benchmarks for future index optimization.

| Query | Candidate Count | Latency | Ranking Time | Total API | Result Count |
|---|---|---|---|---|---|
| milk | 65 | 2515ms | 1ms | 2517ms | 20 |
| rice | 27 | 788ms | 1ms | 790ms | 20 |
| oil | 0 | 306ms | 0ms | 306ms | 0 |
| atta | 2 | 818ms | 0ms | 818ms | 2 |
| amul | 46 | 716ms | 1ms | 717ms | 20 |
| coke | 2 | 713ms | 0ms | 713ms | 2 |
| maggi | 36 | 754ms | 0ms | 755ms | 20 |
| coffee | 3 | 819ms | 0ms | 819ms | 3 |
| paneer | 0 | 307ms | 0ms | 307ms | 0 |
| chocolate | 8 | 783ms | 0ms | 783ms | 8 |
