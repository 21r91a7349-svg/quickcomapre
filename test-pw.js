const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  let searchData = null;
  
  // Intercept the API response
  page.on('response', async (response) => {
    if (response.url().includes('/api/v3/search')) {
      try {
        const json = await response.json();
        searchData = json;
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.zeptonow.com/search?q=milk', { waitUntil: 'networkidle' });
    
    if (searchData) {
      console.log('Intercepted API response successfully!');
      console.log('Widget Count:', searchData.layout?.length || 0);
      const productWidgets = searchData.layout?.filter(w => w.widgetId === 'SEARCH_RESULTS' || (w.data && w.data.items && w.data.items.length > 0)) || [];
      if (productWidgets.length > 0) {
        const items = productWidgets[0].data.items.slice(0, 5);
        console.log('Top 5 Products:');
        items.forEach(item => {
          if (item.product) {
            console.log(`- ${item.product.name} (ID: ${item.product.id}, Price: ${item.product.sellingPrice || item.product.discountedPrice})`);
          }
        });
      }
    } else {
      console.log('No search API response intercepted. Trying to extract from DOM...');
      // Zepto product cards usually have data-testid="product-card" or similar, but since we are just validating MVP, we can dump some text
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(bodyText.substring(0, 500));
    }
  } catch (err) {
    console.error('Playwright Error:', err);
  } finally {
    await browser.close();
  }
})();
