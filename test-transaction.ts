import 'dotenv/config';
import { prisma } from './src/scraper/core/db';

async function testTransactionTiming() {
  const platformId = 'cmrmizj1o0000zkf08x5c50c0'; // Mock/arbitrary valid platform ID or fetch one
  const platform = await prisma.platform.findFirst();
  if (!platform) throw new Error("No platform");
  
  const products = await prisma.product.findMany({ take: 20 });
  
  console.log(`Testing batch upsert of ${products.length} listings...`);
  
  const upserts = products.map((p, i) => prisma.listing.upsert({
    where: { platformId_platformProductId: { platformId: platform.id, platformProductId: `test_${i}` } },
    update: { currentPrice: 100 },
    create: {
      productId: p.id,
      platformId: platform.id,
      platformProductId: `test_${i}`,
      currentPrice: 100,
      imageUrl: '',
      productUrl: ''
    }
  }));
  
  const start = Date.now();
  try {
    await prisma.$transaction(upserts);
    console.log(`Transaction completed in ${Date.now() - start}ms`);
  } catch (e: any) {
    console.log(`Transaction failed after ${Date.now() - start}ms:`, e.message);
  }
}

testTransactionTiming().catch(console.error).finally(() => process.exit(0));
