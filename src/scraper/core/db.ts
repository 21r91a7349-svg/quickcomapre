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
  const url = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export class DatabaseSync {
  private logger = new ScraperLogger('DatabaseSync');
  private matcher = new ProductMatcher();

  /**
   * Syncs scraped products into the database.
   * Creates or updates Platform, Products, and Listings.
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

    // STAGE 3: Batch database writes
    // Build Listing Upserts
    if (successfulMatches.length > 0) {
      const listingUpserts = successfulMatches.map(({ item, product }) => 
        prisma.listing.upsert({
          where: {
            platformId_platformProductId: {
              platformId: platform.id,
              platformProductId: item.platformProductId
            }
          },
          update: {
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

      // Execute Listing Upserts concurrently to avoid sequential transaction latency
      const listings = await Promise.all(listingUpserts);

      // Execute PriceHistory Inserts in a single batch insert
      await prisma.priceHistory.createMany({
        data: listings.map((listing, i) => ({
          listingId: listing.id,
          price: successfulMatches[i].item.currentPrice
        }))
      });

      // STAGE 5: Background Alert Evaluation
      const uniqueProductIds = [...new Set(successfulMatches.map(sm => sm.product.id))];
      // Fire and forget alert evaluation (runs concurrently)
      uniqueProductIds.forEach(productId => {
        evaluateAlertsForProduct(productId).catch(err => {
          this.logger.error(`Alert evaluation failed for ${productId}`, { error: err.message });
        });
      });

      syncedCount = successfulMatches.length;
    }

    this.logger.info(`Successfully synced ${syncedCount}/${results.length} products to DB`);
  }
}
