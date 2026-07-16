import { BrowserManager } from '../../core/BrowserManager';
import { RequestManager } from '../../core/RequestManager';

async function testBlinkit() {
  const browserManager = new BrowserManager();
  
  const { context, page } = await browserManager.newPage('blinkit');
  let productsData: any = null;

  try {
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/v1/layout/search') && !url.includes('empty_search')) {
        try {
          const json = await response.json();
          if (json.is_success && json.response && json.response.snippets) {
            productsData = json.response.snippets;
          }
        } catch (e) {}
      }
    });

    console.log('Navigating to Blinkit...');
    await page.goto('https://blinkit.com/s/?q=milk', { waitUntil: 'networkidle' });
    
    if (productsData) {
      const products = productsData.filter((s: any) => s.data && s.data.name && s.data.name.text);
      console.log(`Found ${products.length} products`);
      if (products.length > 0) {
        console.log('Sample Product:', JSON.stringify(products[0].data, null, 2));
      } else if (productsData.length > 0) {
        console.log('Sample Snippet 0:', JSON.stringify(productsData[0], null, 2));
      }
    }
  } finally {
    await browserManager.closePage('blinkit', context, page);
    await browserManager.closeBrowser();
  }
}

testBlinkit().catch(console.error).finally(() => process.exit(0));
