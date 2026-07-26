import { PrismaClient } from '@prisma/client';
import { NormalizedProduct, ScraperAdapter } from '../types';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { ScraperLogger } from './logger';
import { ProductMatcher } from './matcher';
import { evaluateAlertsForProduct } from './alertEngine';
import pMap from 'p-map';

// For Next.js App Router we need a global prisma instance to avoid connection exhaustion in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[Prisma] DATABASE_URL missing from environment. Fail-fast active.');
  }
  const pool = new Pool({ connectionString: url || 'postgres://localhost:5432/missing_db' });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export class DatabaseSync {
  private logger = new ScraperLogger('DatabaseSync');
  private matcher = new ProductMatcher();

  /**
   * Syncs scraped products into the database transactionally.
   * Creates or updates Platform, Products, and Listings atomically.
   */
  async syncScraperResults(adapter: ScraperAdapter, results: NormalizedProduct[]) {
    const platformMeta = adapter.getPlatform();
    this.logger.info(`Starting DB sync for ${results.length} products from ${platformMeta.name}`);
    
    // 1. Ensure platform exists
    const platform = await prisma.platform.upsert({
      where: { slug: platformMeta.slug },
      update: { name: platformMeta.name, active: true },
      create: {
        name: platformMeta.name,
        slug: platformMeta.slug,
        type: 'QUICK_COMMERCE'
      }
    });

    // STAGE 1: Preload caches to reduce database round-trips
    await this.matcher.preload(results, platform.id);

    let syncedCount = 0;
    
    // STAGE 2 & 4: Controlled Concurrency via pMap
    const CONCURRENCY_LIMIT = 16;
    
    const matchedProducts = await pMap(results, async (item) => {
      try {
        const product = await this.matcher.matchOrCreateProduct(item, platform.id);
        return { item, product };
      } catch (error: any) {
        this.logger.error(`Failed to match/create product ${item.display_name}`, { error: error.message });
        return null;
      }
    }, { concurrency: CONCURRENCY_LIMIT });

    const successfulMatches = matchedProducts.filter((res): res is { item: NormalizedProduct, product: any } => res !== null);

    // STAGE 3: Transactional database writes
    if (successfulMatches.length > 0) {
      await prisma.$transaction(async (tx) => {
        const listingUpserts = successfulMatches.map(({ item, product }) => 
          tx.listing.upsert({
            where: {
              platformId_platformProductId: {
                platformId: platform.id,
                platformProductId: item.platformProductId
              }
            },
            update: {
              productId: product.id,
              currentPrice: item.currentPrice,
              originalPrice: item.originalPrice,
              discount: item.discount,
              inStock: item.inStock,
              deliveryTime: item.deliveryTime,
              imageUrl: item.canonical_image_url,
              productUrl: item.productUrl,
              lastScrapedAt: new Date()
            },
            create: {
              productId: product.id,
              platformId: platform.id,
              platformProductId: item.platformProductId,
              currentPrice: item.currentPrice,
              originalPrice: item.originalPrice,
              discount: item.discount,
              inStock: item.inStock,
              deliveryTime: item.deliveryTime,
              imageUrl: item.canonical_image_url,
              productUrl: item.productUrl,
            }
          })
        );

        const listings = await Promise.all(listingUpserts);

        await tx.priceHistory.createMany({
          data: listings.map((listing, i) => ({
            listingId: listing.id,
            price: successfulMatches[i].item.currentPrice
          }))
        });
      });

      // STAGE 5: Background Alert Evaluation
      const uniqueProductIds = [...new Set(successfulMatches.map(sm => sm.product.id))];
      uniqueProductIds.forEach(productId => {
        evaluateAlertsForProduct(productId).catch(err => {
          this.logger.error(`Alert evaluation failed for ${productId}`, { error: err.message });
        });
      });

      syncedCount = successfulMatches.length;
    }

    this.logger.info(`Successfully synced ${syncedCount}/${results.length} products transactionally to DB`);
  }
}
