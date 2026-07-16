import { NormalizedProduct, ScraperAdapter, PlatformMeta } from '../../types';
import { BrowserManager } from '../../core/BrowserManager';
import { RequestManager } from '../../core/RequestManager';
import { ScraperLogger } from '../../core/logger';
import { normalizeProductName, extractQuantityAndUnit, parsePrice } from '../../core/parser';

export class BlinkitAdapter implements ScraperAdapter {
  private logger = new ScraperLogger('BlinkitAdapter');
  private browserManager = new BrowserManager();
  private requestManager = new RequestManager();

  getPlatform(): PlatformMeta {
    return {
      id: 'blinkit_prod_1',
      name: 'Blinkit',
      slug: 'blinkit'
    };
  }

  async search(query: string): Promise<NormalizedProduct[]> {
    return this.requestManager.execute(
      async () => {
        const { context, page } = await this.browserManager.newPage(this.getPlatform().slug);
        let productsData: any[] = [];

        try {
          // Intercept the search API call
          page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/v1/layout/search') && !url.includes('empty_search')) {
              try {
                const json = await response.json();
                if (json.is_success && json.response && json.response.snippets) {
                  // Some calls return paginated or extra snippets, collect them all
                  productsData = [...productsData, ...json.response.snippets];
                }
              } catch (e) {
                // Ignore JSON parse errors on non-json responses
              }
            }
          });

          this.logger.debug(`Navigating to Blinkit search for: ${query}`);
          await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle', timeout: 20000 });
          
          return this.parseResponse(productsData);
        } finally {
          await this.browserManager.closePage(this.getPlatform().slug, context, page);
        }
      },
      { domain: 'blinkit.com', platform: this.getPlatform().slug, query }
    );
  }

  private parseResponse(snippets: any[]): NormalizedProduct[] {
    if (!snippets || snippets.length === 0) return [];

    const results: NormalizedProduct[] = [];
    
    for (const snippet of snippets) {
      try {
        const data = snippet.data;
        if (!data || !data.name || !data.name.text || !data.normal_price || !data.normal_price.text) continue;
        
        const rawName = data.name.text;
        const brandName = data.brand_name?.text || null;
        const variantText = data.variant?.text || '';
        const { quantity, unit } = extractQuantityAndUnit(variantText);
        
        // Parse prices (remove ₹ and comma)
        const currentPrice = parsePrice(data.normal_price.text.replace(/[^0-9.]/g, ''));
        const originalPrice = data.mrp?.text ? parsePrice(data.mrp.text.replace(/[^0-9.]/g, '')) : currentPrice;
        
        let discount = 0;
        if (originalPrice > currentPrice) {
          discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        const normalizedName = normalizeProductName(rawName);
        const imageUrl = data.image?.url || null;
        const productId = data.product_id || data.id || data.identity?.id || data.merchant_product_id;
        
        if (!productId) {
          this.logger.debug(`Missing product ID for ${rawName}`);
          continue;
        }

        results.push({
          normalized_name: normalizedName,
          display_name: rawName,
          brand: brandName,
          category: 'OTHER',
          quantity,
          unit,
          canonical_image_url: imageUrl,
          
          platformProductId: productId.toString(),
          productUrl: `https://blinkit.com/prn/product/prid/${productId}`,
          currentPrice,
          originalPrice,
          discount: discount > 0 ? discount : null,
          inStock: (data.inventory || 0) > 0,
          deliveryTime: '10 mins', // Blinkit default estimate
        });
      } catch (e: any) {
        this.logger.debug(`Failed to parse a Blinkit snippet`, { error: e.message });
      }
    }

    // Deduplicate by product ID just in case
    const uniqueMap = new Map<string, NormalizedProduct>();
    for (const item of results) {
      if (!uniqueMap.has(item.platformProductId)) {
        uniqueMap.set(item.platformProductId, item);
      }
    }

    const uniqueResults = Array.from(uniqueMap.values());
    this.logger.info(`Parsed ${uniqueResults.length} unique products`);
    return uniqueResults;
  }

  async getProduct(id: string): Promise<NormalizedProduct | null> {
    throw new Error('getProduct not implemented for Blinkit yet.');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const results = await this.search('milk');
      return results.length > 0;
    } catch {
      return false;
    }
  }
}
