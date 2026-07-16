import 'dotenv/config';
import { scraperOrchestrator } from './src/scraper';
import { prisma } from './src/scraper/core/db';
import { ZeptoAdapter } from './src/scraper/adapters/zepto';
import { extractQuantityAndUnit, normalizeProductName, parsePrice } from './src/scraper/core/parser';
import { DatabaseSync } from './src/scraper/core/db';

async function validate() {
  console.log('--- 1. Testing DB Sync with Live Zepto Format ---');
  
  // Real Zepto response format for "milk"
  const zeptoMockData = {
    layout: [
      {
        widgetId: "SEARCH_RESULTS",
        data: {
          items: [
            {
              product: {
                id: "d31a547b-1b2c-4970-8272-359f13e1de86",
                name: "Amul Taaza Toned Fresh Milk",
                brand: "Amul",
                weight: "500 ml",
                mrp: 2700, // Zepto stores price in paise or cents
                sellingPrice: 2700,
                discountPercent: 0,
                outOfStock: false,
                imageResponse: { image: { url: "images/products/amul_taaza.jpg" } }
              }
            },
            {
              product: {
                id: "f8d8b6c4-11bc-4e60-91a5-8123df1363e8",
                name: "Nandini GoodLife Toned Milk",
                brand: "Nandini",
                weight: "1 l",
                mrp: 6000,
                sellingPrice: 5800,
                discountPercent: 3,
                outOfStock: false,
                imageResponse: { image: { url: "images/products/nandini_goodlife.jpg" } }
              }
            }
          ]
        }
      }
    ]
  };

  const zepto = new ZeptoAdapter();
  // We use the real parser
  const parsed = zepto['parseResponse'](zeptoMockData);
  
  console.log(`Parsed ${parsed.length} products`);
  parsed.forEach(p => console.log(`- ${p.display_name} | Price: ${(p.currentPrice/100).toFixed(2)} | Qty: ${p.quantity}${p.unit}`));

  const dbSync = new DatabaseSync();
  await dbSync.syncScraperResults(zepto, parsed);

  console.log('\n--- 2. Database Validation (Prisma Queries) ---');
  const products = await prisma.product.findMany({ include: { listings: true } });
  console.log(`Total Products in DB: ${products.length}`);
  console.log(JSON.stringify(products, null, 2));

  console.log('\n--- 3. API Response Validation ---');
  const apiResponse = await scraperOrchestrator.getSearchResults('milk');
  console.log(JSON.stringify(apiResponse, null, 2));
}

validate().catch(console.error).finally(() => process.exit(0));
