export interface NormalizedProduct {
  normalized_name: string;
  display_name: string;
  brand: string | null;
  category?: string | null;
  quantity: number | null;
  unit: string | null;
  canonical_image_url: string | null;
  
  // Listing details for this specific platform
  platformProductId: string;
  productUrl: string | null;
  currentPrice: number;
  originalPrice: number | null;
  discount: number | null;
  inStock: boolean;
  deliveryTime: string | null;
}

export interface PlatformMeta {
  id: string;
  name: string;
  slug: string;
}

export type PlatformStatusCode = 
  | 'SUCCESS'
  | 'ZERO_RESULTS'
  | 'TIMEOUT'
  | 'PARSER_FAILED'
  | 'NETWORK_FAILED'
  | 'BLOCKED_BY_ANTI_BOT'
  | 'DISABLED'
  | 'NOT_IMPLEMENTED'
  | 'SKIPPED_CACHE_FRESH';

export interface PlatformExecutionResult {
  platform: string;
  slug: string;
  status: PlatformStatusCode;
  productsScraped: number;
  productsNormalized: number;
  latencyMs: number;
  error?: string;
  details?: any;
}

export interface ScraperAdapter {
  getPlatform(): PlatformMeta;
  search(query: string): Promise<NormalizedProduct[]>;
  getProduct(id: string): Promise<NormalizedProduct | null>;
  healthCheck(): Promise<boolean>;

  // Capability methods
  isEnabled(): boolean;
  supportsSearch(): boolean;
  supportsProduct(): boolean;
  supportsSuggestions(): boolean;
  supportsPriceHistory(): boolean;
  supportsInventory(): boolean;
  supportsOffers(): boolean;
  priority: number;
}

export interface DbSyncResult {
  syncedCount: number;
  newCanonicalCount: number;
  mergedListingsCount: number;
  priceUpdatesCount: number;
  duplicatesSkippedCount: number;
  failedListingsCount: number;
  syncErrorsCount: number;
}

export interface AdapterHealthEntry {
  slug: string;
  platform: string;
  status: PlatformStatusCode;
  latencyMs: number;
  products: number;
  error?: string;
  lastChecked: string;
}
