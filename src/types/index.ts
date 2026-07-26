export interface Platform {
  name: string;
  slug: string;
}

export interface Listing {
  id: string;
  platform: Platform;
  currentPrice: number;
  originalPrice: number | null;
  discount: number | null;
  inStock: boolean;
  deliveryTime: string | null;
  productUrl: string | null;
}

export interface PlatformCoverage {
  supportedPlatforms: number;
  availablePlatforms: number;
  score: number; // e.g. 0.67 or 1.0
  percentageText: string; // e.g. "2/2 (100%)"
  platformDetails: { name: string; slug: string; available: boolean; price?: number }[];
}

export interface Product {
  id: string;
  display_name: string;
  brand: string | null;
  quantity: number | null;
  unit: string | null;
  canonical_image_url: string | null;
  listings: Listing[];
  coverage?: PlatformCoverage;
}
