import { ScraperAdapter, NormalizedProduct, PlatformMeta } from '../../types';
import { ScraperLogger } from '../../core/logger';
import { BrowserManager } from '../../core/BrowserManager';
import { RequestManager } from '../../core/RequestManager';
import { normalizeProductName, extractQuantityAndUnit, parsePrice } from '../../core/parser';
import { scraperConfig } from '../../config';
import * as fs from 'fs';
import * as path from 'path';

export class ZeptoAdapter implements ScraperAdapter {
  private logger = new ScraperLogger('ZeptoAdapter');
  private browserManager = new BrowserManager();
  private requestManager = new RequestManager();

  priority = 3;
  isEnabled(): boolean { return scraperConfig.enabledPlatforms.includes('zepto'); }
  supportsSearch(): boolean { return true; }
  supportsProduct(): boolean { return false; }
  supportsSuggestions(): boolean { return false; }
  supportsPriceHistory(): boolean { return false; }
  supportsInventory(): boolean { return false; }
  supportsOffers(): boolean { return false; }

  getPlatform(): PlatformMeta {
    return {
      id: 'zepto_prod_1',
      name: 'Zepto',
      slug: 'zepto'
    };
  }

  async search(query: string): Promise<NormalizedProduct[]> {
    return this.requestManager.execute(
      async () => {
        const { context, page } = await this.browserManager.newPage(this.getPlatform().slug);

        try {
          this.logger.info(`Fetching Zepto API for: ${query}`);
          const url = `https://api.zeptonow.com/api/v3/search?q=${encodeURIComponent(query)}`;
          
          const response = await page.request.fetch(url, {
            headers: {
              'Origin': 'https://www.zeptonow.com',
              'Referer': 'https://www.zeptonow.com/',
              'Accept': 'application/json',
              'app_version': '12.25.0',
              'app_sub_version': '12.25.0',
              'platform': 'WEB',
              'tenant': 'ZEPTO',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
          });

          const status = response.status();
          
          // Anti-bot detection: 403 / Cloudflare challenge
          if (status === 403 || status === 401) {
            throw new Error(`BLOCKED_BY_ANTI_BOT: Zepto returned HTTP ${status}`);
          }

          if (status >= 500) {
            throw new Error(`NETWORK_FAILED: Zepto returned HTTP ${status}`);
          }

          if (!response.ok()) {
            throw new Error(`NETWORK_FAILED: Zepto returned HTTP ${status}`);
          }

          let data: any;
          try {
            data = await response.json();
          } catch (jsonErr: any) {
            throw new Error(`PARSER_FAILED: Zepto response is not valid JSON — ${jsonErr.message}`);
          }

          // Save raw payload when DEBUG_ADAPTERS is enabled
          if (scraperConfig.debugAdapters) {
            try {
              const debugDir = path.resolve(process.cwd(), 'logs');
              if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
              fs.writeFileSync(
                path.join(debugDir, `zepto-raw-${Date.now()}.json`),
                JSON.stringify(data, null, 2).substring(0, 50000)
              );
            } catch (e) { /* debug write failure is non-fatal */ }
          }

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
    
    // Check if data is null/undefined or an error response
    if (!data) {
      throw new Error('PARSER_FAILED: Zepto returned null/undefined response body');
    }

    // Zepto may return an error object
    if (data.error || data.statusCode >= 400) {
      throw new Error(`BLOCKED_BY_ANTI_BOT: Zepto API error — ${data.error || data.message || 'Unknown'}`);
    }

    // Check for expected layout structure
    if (!data.layout || !Array.isArray(data.layout)) {
      // Zepto might use a different response format — check for alternative structures
      if (data.storeProductsResponse?.products) {
        return this.parseProductsArray(data.storeProductsResponse.products);
      }
      if (data.data?.products) {
        return this.parseProductsArray(data.data.products);
      }
      throw new Error(`PARSER_FAILED: Unexpected Zepto response structure (keys: ${Object.keys(data).join(', ')})`);
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
            productUrl: `https://www.zeptonow.com/pn/${(p.name || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}/pvid/${p.id}`,
            currentPrice: parsePrice(p.sellingPrice || p.discountedPrice || p.mrp),
            originalPrice: parsePrice(p.mrp),
            discount: p.discountPercent || null,
            inStock: !p.outOfStock,
            deliveryTime: '10 mins',
          });
        }
      }
    } catch (error: any) {
      if (error.message.startsWith('PARSER_FAILED') || error.message.startsWith('BLOCKED_BY_ANTI_BOT')) {
        throw error;
      }
      throw new Error(`PARSER_FAILED: ${error.message}`);
    }

    if (results.length === 0 && data.layout.length > 0) {
      this.logger.warn(`Zepto returned layout widgets but 0 parseable products (widgets: ${data.layout.length})`);
    }

    this.logger.info(`Parsed ${results.length} products from Zepto`);
    return results;
  }

  private parseProductsArray(products: any[]): NormalizedProduct[] {
    const results: NormalizedProduct[] = [];
    for (const p of products) {
      if (!p.name && !p.productName) continue;
      const name = p.name || p.productName;
      const { quantity, unit } = extractQuantityAndUnit(name || p.weight || '');
      results.push({
        normalized_name: normalizeProductName(name),
        display_name: name,
        brand: p.brand || null,
        category: p.category?.name || p.categoryName || null,
        quantity,
        unit,
        canonical_image_url: p.imageUrl || p.image || null,
        platformProductId: String(p.id || p.productId),
        productUrl: `https://www.zeptonow.com/pn/${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}/pvid/${p.id || p.productId}`,
        currentPrice: parsePrice(p.sellingPrice || p.price || p.mrp),
        originalPrice: parsePrice(p.mrp),
        discount: p.discountPercent || null,
        inStock: p.inStock !== false && !p.outOfStock,
        deliveryTime: '10 mins',
      });
    }
    this.logger.info(`Parsed ${results.length} products from Zepto (products array format)`);
    return results;
  }

  async getProduct(id: string): Promise<NormalizedProduct | null> {
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
