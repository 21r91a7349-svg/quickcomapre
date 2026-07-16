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

export interface ScraperAdapter {
  /**
   * Return metadata about this platform.
   */
  getPlatform(): PlatformMeta;

  /**
   * Search for products on the platform.
   */
  search(query: string): Promise<NormalizedProduct[]>;

  /**
   * Fetch a single product's exact details by its platform ID.
   */
  getProduct(id: string): Promise<NormalizedProduct | null>;

  /**
   * Test if the platform is currently reachable and scraping is healthy.
   */
  healthCheck(): Promise<boolean>;
}
