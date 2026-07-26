import { prisma } from './src/scraper/core/db';

async function runBenchmark() {
  console.log('=========================================================');
  console.log('BENCHMARK EVALUATION BASELINE');
  console.log('=========================================================\n');

  const products = await prisma.product.findMany({
    include: {
      listings: {
        include: { platform: true }
      }
    }
  });

  const activePlatforms = await prisma.platform.findMany({ where: { active: true } });
  const activePlatformCount = activePlatforms.length || 2; // Default to 2 (Blinkit, BigBasket)

  let singleListingCount = 0;
  let multiListingCount = 0;
  let totalListingsCount = 0;
  let coverageSum = 0;

  products.forEach(p => {
    const listingCount = p.listings.length;
    totalListingsCount += listingCount;
    if (listingCount > 1) multiListingCount++;
    else singleListingCount++;

    const uniquePlatforms = new Set(p.listings.map(l => l.platform.slug)).size;
    coverageSum += uniquePlatforms / activePlatformCount;
  });

  const totalProducts = products.length;
  const avgListingsPerProduct = totalProducts > 0 ? (totalListingsCount / totalProducts).toFixed(2) : '0';
  const avgCoverageScore = totalProducts > 0 ? ((coverageSum / totalProducts) * 100).toFixed(1) : '0';

  console.log(`Total Canonical Products in DB: ${totalProducts}`);
  console.log(`Products with Single Listing: ${singleListingCount}`);
  console.log(`Products with Multi-Platform Listings (>=2): ${multiListingCount}`);
  console.log(`Average Listings per Canonical Product: ${avgListingsPerProduct}`);
  console.log(`Average Catalog Platform Coverage: ${avgCoverageScore}%`);
  console.log('=========================================================\n');
}

runBenchmark().catch(console.error).finally(() => process.exit(0));
