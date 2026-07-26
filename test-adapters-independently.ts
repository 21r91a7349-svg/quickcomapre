import { BlinkitAdapter } from './src/scraper/adapters/blinkit';
import { BigBasketAdapter } from './src/scraper/adapters/bigbasket';

async function validateAdapters() {
  console.log('--- Phase 5: Platform Adapter Validation ---');
  
  // 1. Blinkit Test
  console.log('\n[TEST 1/2] Testing BlinkitAdapter search("milk")...');
  const blinkit = new BlinkitAdapter();
  try {
    const blinkitResults = await blinkit.search('milk');
    console.log(`Blinkit returned ${blinkitResults.length} products.`);
    if (blinkitResults.length > 0) {
      console.log('Sample Blinkit product:', {
        display_name: blinkitResults[0].display_name,
        currentPrice: blinkitResults[0].currentPrice,
        brand: blinkitResults[0].brand,
        quantity: blinkitResults[0].quantity,
        unit: blinkitResults[0].unit,
        inStock: blinkitResults[0].inStock
      });
    }
  } catch (err: any) {
    console.error('Blinkit test error:', err.message);
  }

  // 2. BigBasket Test
  console.log('\n[TEST 2/2] Testing BigBasketAdapter search("milk")...');
  const bigbasket = new BigBasketAdapter();
  try {
    const bbResults = await bigbasket.search('milk');
    console.log(`BigBasket returned ${bbResults.length} products.`);
    if (bbResults.length > 0) {
      console.log('Sample BigBasket product:', {
        display_name: bbResults[0].display_name,
        currentPrice: bbResults[0].currentPrice,
        brand: bbResults[0].brand,
        quantity: bbResults[0].quantity,
        unit: bbResults[0].unit,
        inStock: bbResults[0].inStock
      });
    }
  } catch (err: any) {
    console.error('BigBasket test error:', err.message);
  }
}

validateAdapters().catch(console.error).finally(() => process.exit(0));
