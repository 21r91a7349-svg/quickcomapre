import { NextResponse } from 'next/server';
import { prisma } from '@/scraper/core/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verify Database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // 2. Verify Schema Migration & Table Readiness (RELEASE BLOCKER #4)
    // Query essential tables to guarantee migrations have executed successfully before returning healthy
    const [platformCount, productCount, listingCount] = await Promise.all([
      prisma.platform.count(),
      prisma.product.count(),
      prisma.listing.count()
    ]);

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        schema: {
          migrated: true,
          tablesReady: true,
          counts: {
            platforms: platformCount,
            products: productCount,
            listings: listingCount
          }
        },
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Healthcheck schema validation failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected_or_unmigrated',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
