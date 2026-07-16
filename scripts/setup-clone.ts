import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function setupClone() {
    // 1. Prisma client for public schema
    const prismaProd = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } }
    });

    // 2. Prisma client for test schema
    const testUrl = process.env.DATABASE_URL + '?schema=test_clone';
    const prismaTest = new PrismaClient({
        datasources: { db: { url: testUrl } }
    });

    console.log('Copying data from public to test_clone...');
    
    const products = await prismaProd.product.findMany();
    const listings = await prismaProd.productListing.findMany();
    const aliases = await prismaProd.productAlias.findMany();
    const history = await prismaProd.priceHistory.findMany();

    // Clear test DB first (it assumes tables exist from prisma db push)
    await prismaTest.priceHistory.deleteMany();
    await prismaTest.productListing.deleteMany();
    await prismaTest.productAlias.deleteMany();
    await prismaTest.product.deleteMany();

    // Insert
    if (products.length > 0) await prismaTest.product.createMany({ data: products });
    if (listings.length > 0) await prismaTest.productListing.createMany({ data: listings });
    if (aliases.length > 0) await prismaTest.productAlias.createMany({ data: aliases });
    if (history.length > 0) await prismaTest.priceHistory.createMany({ data: history });

    console.log('Clone complete!');
}

setupClone().catch(console.error).finally(() => process.exit(0));
