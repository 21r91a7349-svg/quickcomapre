import 'dotenv/config';
import { ZeptoAdapter } from './src/scraper/adapters/zepto';
import { BlinkitAdapter } from './src/scraper/adapters/blinkit';
import { BigBasketAdapter } from './src/scraper/adapters/bigbasket';

async function testAdapters() {
  console.log('=========================================================');
  console.log('Stage 3: Scraper Audit');
  console.log('=========================================================');
  
  const query = 'milk';
  
  // Blinkit
  console.log('\n--- Blinkit ---');
  try {
    const blinkit = new BlinkitAdapter();
    const bResults = await blinkit.search(query);
    console.log('Products scraped:', bResults.length > 0 ? 'Yes' : 'No');
    console.log('Count:', bResults.length);
    console.log('Example products:', bResults.slice(0, 3).map(p => p.display_name));
  } catch (e) {
    console.log('Blinkit Failed:', e.message);
  }

  // BigBasket
  console.log('\n--- BigBasket ---');
  try {
    const bigbasket = new BigBasketAdapter();
    const bbResults = await bigbasket.search(query);
    console.log('Products scraped:', bbResults.length > 0 ? 'Yes' : 'No');
    console.log('Count:', bbResults.length);
    console.log('Example products:', bbResults.slice(0, 3).map(p => p.display_name));
  } catch (e) {
    console.log('BigBasket Failed:', e.message);
  }

  // Zepto
  console.log('\n--- Zepto ---');
  try {
    const zepto = new ZeptoAdapter();
    const zResults = await zepto.search(query);
    console.log('Products scraped:', zResults.length > 0 ? 'Yes' : 'No');
    console.log('Count:', zResults.length);
    console.log('Example products:', zResults.slice(0, 3).map(p => p.display_name));
  } catch (e) {
    console.log('Zepto Failed:', e.message);
  }
}

testAdapters().catch(console.error).then(() => process.exit(0));
