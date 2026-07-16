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

export interface Product {
  id: string;
  display_name: string;
  brand: string | null;
  quantity: number | null;
  unit: string | null;
  canonical_image_url: string | null;
  listings: Listing[];
}
