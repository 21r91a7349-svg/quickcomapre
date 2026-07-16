import { ScraperAdapter, NormalizedProduct, PlatformMeta } from '../../types';
import { ScraperLogger } from '../../core/logger';
import { BrowserManager } from '../../core/BrowserManager';
import { RequestManager } from '../../core/RequestManager';
import { normalizeProductName, extractQuantityAndUnit, parsePrice } from '../../core/parser';

export class ZeptoAdapter implements ScraperAdapter {
  private logger = new ScraperLogger('ZeptoAdapter');
  private browserManager = new BrowserManager();
  private requestManager = new RequestManager();

  getPlatform() {
    return {
      id: 'zepto_prod_1', // Will be mapped to real DB ID
      name: 'Zepto',
      slug: 'zepto'
    };
  }

  async search(query: string): Promise<NormalizedProduct[]> {
    return this.requestManager.execute(
      async () => {
        const { context, page } = await this.browserManager.newPage(this.getPlatform().slug);

        try {
          this.logger.debug(`Fetching Zepto API via Browser context for: ${query}`);
          const url = `https://api.zeptonow.com/api/v3/search?q=${encodeURIComponent(query)}`;
          
          const response = await page.request.fetch(url, {
            headers: {
              'Origin': 'https://www.zeptonow.com',
              'Referer': 'https://www.zeptonow.com/',
              'app_version': '10.33.2',
              'platform': 'WEB',
              'tenant': 'ZEPTO'
            }
          });
          
          const data = await response.json();
          return this.parseResponse(data);
        } finally {
          await this.browserManager.closePage(this.getPlatform().slug, context, page);
        }
      },
      { domain: 'zeptonow.com', platform: this.getPlatform().slug, query }
    );
  }

  private parseResponse(data: any): NormalizedProduct[] {
    const results: NormalizedProduct[] = [];
    
    // Safety check - WAFs might return HTML instead of JSON if blocked
    if (!data || !data.layout || !Array.isArray(data.layout)) {
      this.logger.warn('Unexpected API response structure', { dataPreview: JSON.stringify(data).substring(0, 200) });
      return results;
    }

    try {
      // Find the widget containing products
      const productWidgets = data.layout.filter((w: any) => 
        w.widgetId === 'SEARCH_RESULTS' || 
        (w.data && w.data.items && w.data.items.length > 0)
      );

      for (const widget of productWidgets) {
        const items = widget.data?.items || [];
        
        for (const item of items) {
          if (!item.product) continue;
          
          const p = item.product;
          const { quantity, unit } = extractQuantityAndUnit(p.name || p.weight || '');
          
          results.push({
            normalized_name: normalizeProductName(p.name),
            display_name: p.name,
            brand: p.brand || null,
            category: p.category?.name || null,
            quantity,
            unit,
            canonical_image_url: p.imageResponse?.image?.url ? `https://cdn.zeptonow.com/${p.imageResponse.image.url}` : null,
            
            platformProductId: p.id,
            productUrl: `https://www.zeptonow.com/pn/${p.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}/pvid/${p.id}`,
            currentPrice: parsePrice(p.sellingPrice || p.discountedPrice),
            originalPrice: parsePrice(p.mrp),
            discount: p.discountPercent || null,
            inStock: !p.outOfStock,
            deliveryTime: '10 mins', // Zepto usually hardcodes delivery time at store level, mocking for MVP
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to parse Zepto response', { error: error.message });
    }
    
    this.logger.info(`Successfully parsed ${results.length} products`);
    return results;
  }

  async getProduct(id: string): Promise<NormalizedProduct | null> {
    // For MVP, we can stub this or make a single item request
    this.logger.info(`getProduct called for ${id}`);
    throw new Error('Method not implemented.');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.search('milk');
      return true;
    } catch (e) {
      return false;
    }
  }
}
