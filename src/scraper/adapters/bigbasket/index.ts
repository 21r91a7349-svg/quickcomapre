import { ScraperAdapter, NormalizedProduct, PlatformMeta } from '../../types';
import { ScraperLogger } from '../../core/logger';
import { BrowserManager } from '../../core/BrowserManager';
import { RequestManager } from '../../core/RequestManager';
import { normalizeProductName, extractQuantityAndUnit, parsePrice } from '../../core/parser';

export class BigBasketAdapter implements ScraperAdapter {
  private logger = new ScraperLogger('BigBasketAdapter');
  private browserManager = new BrowserManager();
  private requestManager = new RequestManager();

  getPlatform(): PlatformMeta {
    return {
      id: 'bigbasket_prod_1',
      name: 'BigBasket',
      slug: 'bigbasket'
    };
  }

  async search(query: string): Promise<NormalizedProduct[]> {
    return this.requestManager.execute(
      async () => {
        const { context, page } = await this.browserManager.newPage(this.getPlatform().slug);

        try {
          this.logger.info(`Fetching BigBasket API via Browser context for: ${query}`);
          
          // Using BigBasket's unprotected search API
          const url = `https://www.bigbasket.com/custompage/getsearchdata/?slug=${encodeURIComponent(query)}&type=deck`;
          
          const response = await page.request.fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          if (!response.ok()) {
             throw new Error(`BigBasket API failed with status ${response.status()}`);
          }
          
          const data = await response.json();
          return this.parseResponse(data);
        } finally {
          await this.browserManager.closePage(this.getPlatform().slug, context, page);
        }
      },
      { domain: 'bigbasket.com', platform: this.getPlatform().slug, query }
    );
  }

  private parseResponse(data: any): NormalizedProduct[] {
    const results: NormalizedProduct[] = [];
    
    if (!data || !data.json_data || !data.json_data.tab_info || !data.json_data.tab_info.length) {
       this.logger.warn('Malformed response or no tabs found in BigBasket API');
       return results;
    }
    
    const products = data.json_data.tab_info[0]?.product_info?.products || [];
    
    for (const item of products) {
      if (!item.p_desc || !item.sp) continue;
      
      const rawName = item.p_desc;
      const brand = item.p_brand || 'Unknown';
      const fullName = brand !== 'Unknown' ? `${brand} ${rawName}` : rawName;
      
      const price = parsePrice(item.sp);
      const originalPrice = item.mrp ? parsePrice(item.mrp) : price;
      
      const { quantity, unit } = extractQuantityAndUnit(item.w || '');
      
      results.push({
        platformProductId: String(item.sku),
        display_name: rawName,
        normalized_name: normalizeProductName(fullName),
        brand,
        currentPrice: price,
        originalPrice: originalPrice,
        inStock: true,
        quantity,
        unit,
        category: 'GROCERY',
        canonical_image_url: item.p_img_url || null,
        productUrl: item.absolute_url ? `https://www.bigbasket.com${item.absolute_url}` : null,
        discount: 0,
        deliveryTime: 'Same Day'
      });
    }

    this.logger.info(`Parsed ${results.length} products from BigBasket`);
    return results;
  }

  async getProduct(id: string): Promise<NormalizedProduct | null> {
    throw new Error('Method not implemented.');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const results = await this.search('milk');
      return results.length > 0;
    } catch (e) {
      return false;
    }
  }
}
