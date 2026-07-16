import { prisma } from './src/scraper/core/db';
import { subDays } from 'date-fns';

async function seedPriceHistory() {
  const products = await prisma.product.findMany({
    include: { listings: true },
    take: 5
  });

  if (products.length === 0) {
    console.log("No products found in DB. Run scraper first.");
    process.exit(0);
  }

  let seededCount = 0;

  for (const product of products) {
    for (const listing of product.listings) {
      const basePrice = Number(listing.currentPrice);
      
      // Seed 30 days backwards
      for (let i = 1; i <= 30; i++) {
        // Random fluctuation between -10% and +10%
        const fluctuation = 1 + ((Math.random() - 0.5) * 0.2);
        const randomPrice = basePrice * fluctuation;
        
        await prisma.priceHistory.create({
          data: {
            listingId: listing.id,
            price: randomPrice,
            recordedAt: subDays(new Date(), i)
          }
        });
        seededCount++;
      }
    }
    console.log(`Seeded history for ${product.display_name} (${product.id})`);
  }

  console.log(`Successfully seeded ${seededCount} historical price points.`);
}

seedPriceHistory().catch(console.error).finally(() => process.exit(0));
