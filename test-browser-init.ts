import { BrowserManager } from './src/scraper/core/BrowserManager';

async function testBrowser() {
  console.log('--- Testing BrowserManager Initialization & Fallback ---');
  const bm = new BrowserManager();
  
  try {
    const { context, page } = await bm.newPage('blinkit');
    console.log('Browser launched successfully!');
    const url = 'https://example.com';
    await page.goto(url);
    const title = await page.title();
    console.log(`Navigated to ${url}, Page Title: "${title}"`);
    await bm.closePage('blinkit', context, page);
    await bm.closeBrowser();
    console.log('Browser test PASSED cleanly.');
  } catch (err: any) {
    console.error('Browser test FAILED:', err.message);
    process.exit(1);
  }
}

testBrowser();
