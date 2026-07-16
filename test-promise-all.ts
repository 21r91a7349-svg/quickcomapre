import 'dotenv/config';
import { prisma } from './src/scraper/core/db';

async function testTransactionTiming() {
  const platform = await prisma.platform.findFirst();
  if (!platform) throw new Error("No platform");
  
  const products = await prisma.product.findMany({ take: 20 });
  
  const upserts = products.map((p, i) => prisma.listing.upsert({
    where: { platformId_platformProductId: { platformId: platform.id, platformProductId: `test2_${i}` } },
    update: { currentPrice: 100 },
    create: {
      productId: p.id,
      platformId: platform.id,
      platformProductId: `test2_${i}`,
      currentPrice: 100,
      imageUrl: '',
      productUrl: ''
    }
  }));
  
  console.log(`Testing Promise.all of ${products.length} listings...`);
  const start = Date.now();
  try {
    await Promise.all(upserts);
    console.log(`Promise.all completed in ${Date.now() - start}ms`);
  } catch (e: any) {
    console.log(`Promise.all failed after ${Date.now() - start}ms:`, e.message);
  }
}

testTransactionTiming().catch(console.error).finally(() => process.exit(0));
