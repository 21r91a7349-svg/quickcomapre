import 'dotenv/config';
import { scraperOrchestrator } from './src/scraper/index';
import { prisma } from './src/scraper/core/db';
import { ProductMatcher } from './src/scraper/core/matcher';

async function runPlatformBenchmark() {
  console.log('=========================================================');
  console.log('PLATFORM BENCHMARK EVALUATION & ACCUMULATION METRICS');
  console.log('=========================================================\n');

  const matcher = new ProductMatcher();

  // Run initial consolidation
  const initialConsolidation = await matcher.consolidateDuplicateCanonicals();
  console.log(`Initial DB Consolidation: Merged ${initialConsolidation.mergedCount} duplicate products.`);

  const benchmarkQueries = [
    'Milk',
    'Minute Maid',
    'Coca Cola',
    'Surf Excel',
    'Lays',
    'Rice',
    'Atta',
    'Sprite',
    'Dettol',
    'Maggi'
  ];

  const resultsSummary: any[] = [];

  for (const q of benchmarkQueries) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`Executing Search: "${q}"`);
    console.log(`---------------------------------------------------------`);

    const start = Date.now();
    const response = await scraperOrchestrator.getSearchResults(q);
    const duration = Date.now() - start;

    const canonicalProducts = response.results || [];
    let multiListingProducts = 0;
    let totalListingsInResults = 0;

    canonicalProducts.forEach((p: any) => {
      const listingCount = p.listings?.length || 0;
      totalListingsInResults += listingCount;
      if (listingCount > 1) multiListingProducts++;
    });

    const avgListings = canonicalProducts.length > 0 ? (totalListingsInResults / canonicalProducts.length).toFixed(2) : '0';
    const topProduct = canonicalProducts[0];

    const record = {
      query: q,
      totalCanonicalProducts: response.total || 0,
      multiListingProducts,
      avgListingsPerProduct: avgListings,
      topProductTitle: topProduct ? topProduct.display_name : 'None',
      topProductListingsCount: topProduct ? topProduct.listings?.length : 0,
      topProductCoverage: topProduct?.coverage?.percentageText || '0/3',
      latencyMs: duration
    };

    resultsSummary.push(record);
    console.log('Summary:', record);
    if (topProduct) {
      console.log('Top Product Listings:');
      topProduct.listings.forEach((l: any) => {
        console.log(`  - Platform: ${l.platform.name} | Price: ₹${l.currentPrice} | InStock: ${l.inStock}`);
      });
    }
  }

  // Final DB Metrics
  console.log('\n=========================================================');
  console.log('FINAL DATABASE CATALOG & ACCUMULATION METRICS');
  console.log('=========================================================');
  
  const allProducts = await prisma.product.findMany({
    include: { listings: { include: { platform: true } } }
  });

  const totalProds = allProducts.length;
  let totalListings = 0;
  let multiPlatformProds = 0;
  let coverageSum = 0;

  allProducts.forEach(p => {
    totalListings += p.listings.length;
    const uniquePlatforms = new Set(p.listings.map(l => l.platform.slug)).size;
    if (uniquePlatforms >= 2) multiPlatformProds++;
    coverageSum += (uniquePlatforms / 3);
  });

  const avgListingsPerCanonical = totalProds > 0 ? (totalListings / totalProds).toFixed(2) : '0';
  const avgCoveragePercentage = totalProds > 0 ? ((coverageSum / totalProds) * 100).toFixed(1) : '0';

  console.table(resultsSummary);
  console.log('\nGlobal Catalog Metrics:');
  console.log(`- Total Canonical Products in Database: ${totalProds}`);
  console.log(`- Total Platform Listings in Database: ${totalListings}`);
  console.log(`- Products with Multi-Platform Listings (>=2): ${multiPlatformProds}`);
  console.log(`- Average Listings per Canonical Product: ${avgListingsPerCanonical}`);
  console.log(`- Average Catalog Platform Coverage: ${avgCoveragePercentage}%`);
  console.log('=========================================================\n');
}

runPlatformBenchmark().catch(console.error).finally(() => process.exit(0));
