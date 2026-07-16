import 'dotenv/config';
import { scraperOrchestrator } from './src/scraper/index';
import { prisma } from './src/scraper/core/db';

async function verifyPhase1() {
  console.log('--- Phase 1 Verification ---');
  // 2. Verify adapter initialization is already logged by the constructor!
  
  const queries = ['milk', 'rice', 'onion'];
  
  for (const q of queries) {
    console.log(`\n=========================================================`);
    console.log(`Query: ${q}`);
    console.log(`=========================================================`);
    
    // Clear DB of existing queries? No, production DB. We just count before and after!
    // But since `milk` already exists, we will just run it and observe the output.
    
    const preCounts = {
      Product: await prisma.product.count(),
      Listing: await prisma.listing.count(),
      PriceHistory: await prisma.priceHistory.count()
    };
    
    // 3. Execute Searches
    console.log('\n--- 3. Executing Search ---');
    const start = Date.now();
    const results = await scraperOrchestrator.getSearchResults(q);
    console.log(`Finished in ${Date.now() - start}ms`);
    
    // 4. Verify Database Sync
    const postCounts = {
      Product: await prisma.product.count(),
      Listing: await prisma.listing.count(),
      PriceHistory: await prisma.priceHistory.count()
    };
    
    console.log('\n--- 4. Database Sync Results ---');
    console.log(`Products inserted: ${postCounts.Product - preCounts.Product}`);
    console.log(`Listings inserted: ${postCounts.Listing - preCounts.Listing}`);
    console.log(`PriceHistory inserted: ${postCounts.PriceHistory - preCounts.PriceHistory}`);
    
    // 5. Verify API Response (using the returned results as API simulation)
    console.log('\n--- 5. API Response Sample ---');
    if (results.length > 0) {
      console.log(`Returned ${results.length} products. First 5:`);
      results.slice(0, 5).forEach(p => {
        const platforms = p.listings.map(l => l.platform.name).join(', ');
        console.log(`- ${p.display_name} | Listings: ${p.listings.length} (${platforms})`);
      });
    } else {
      console.log('Returned 0 products.');
    }
  }
}

verifyPhase1().catch(console.error).finally(() => process.exit(0));
