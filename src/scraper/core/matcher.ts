import { GoogleGenAI } from '@google/genai';
import { prisma } from './db';
import { NormalizedProduct } from '../types';
import { ScraperLogger } from './logger';
import { Product } from '@prisma/client';

const logger = new ScraperLogger('ProductMatcher');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FUZZY_AUTO_MERGE_THRESHOLD = 0.92;
const FUZZY_AI_VERIFY_THRESHOLD = 0.80;
const AI_AUTO_MERGE_THRESHOLD = 0.92;
const AI_REVIEW_THRESHOLD = 0.80;

export class ProductMatcher {
  private aliasCache = new Map<string, Product>();
  private deterministicCache = new Map<string, Product>();
  
  // To prevent multiple parallel workers from creating the same new product
  private inProgressCreations = new Map<string, Promise<Product>>();

  /**
   * STAGE 1: Preload necessary records to reduce DB roundtrips.
   */
  async preload(items: NormalizedProduct[], platformId: string) {
    this.aliasCache.clear();
    this.deterministicCache.clear();
    this.inProgressCreations.clear();

    const platformProductIds = items.map(i => i.platformProductId);
    
    // 1. Preload Aliases
    const aliases = await prisma.productAlias.findMany({
      where: { platformId, platformProductId: { in: platformProductIds } },
      include: { product: true }
    });
    for (const alias of aliases) {
      this.aliasCache.set(alias.platformProductId, alias.product);
    }

    // 2. Preload Deterministic Products
    const unmatchedItems = items.filter(i => !this.aliasCache.has(i.platformProductId));
    if (unmatchedItems.length > 0) {
      const names = [...new Set(unmatchedItems.map(i => i.normalized_name))];
      const products = await prisma.product.findMany({
        where: { normalized_name: { in: names } }
      });
      
      for (const p of products) {
        const key = this.getDeterministicKey(p.normalized_name, p.quantity, p.unit, p.brand);
        this.deterministicCache.set(key, p);
      }
    }
  }

  private getDeterministicKey(name: string, qty: number | null, unit: string | null, brand: string | null) {
    return `${name}-${qty || ''}-${unit || ''}-${brand || ''}`;
  }

  async matchOrCreateProduct(item: NormalizedProduct, platformId: string): Promise<Product> {
    // 1. Alias Cache Check (0 DB trips)
    if (this.aliasCache.has(item.platformProductId)) {
      return this.aliasCache.get(item.platformProductId)!;
    }

    const detKey = this.getDeterministicKey(item.normalized_name, item.quantity, item.unit, item.brand);

    // Concurrency Lock: Prevent multiple identical items from bypassing cache simultaneously
    if (this.inProgressCreations.has(detKey)) {
      return await this.inProgressCreations.get(detKey)!;
    }

    const matchPromise = this._executeMatchStrategy(item, platformId, detKey);
    this.inProgressCreations.set(detKey, matchPromise);
    return await matchPromise;
  }

  private async _executeMatchStrategy(item: NormalizedProduct, platformId: string, detKey: string): Promise<Product> {
    // 2. Deterministic Match Cache Check (0 DB trips)
    let product = this.deterministicCache.get(detKey);

    if (product) {
      logger.debug(`[DETERMINISTIC] Exact match found for ${item.normalized_name}`);
      await this.createAlias(product.id, platformId, item);
      return product;
    }

    // 3. Fuzzy Match via pg_trgm (1 DB trip)
    const fuzzyMatches: any[] = await prisma.$queryRaw`
      SELECT id, similarity(normalized_name, ${item.normalized_name}) as score
      FROM "Product"
      WHERE similarity(normalized_name, ${item.normalized_name}) > ${FUZZY_AI_VERIFY_THRESHOLD}
        AND ("quantity" = ${item.quantity} OR "quantity" IS NULL)
        AND ("unit" = ${item.unit} OR "unit" IS NULL)
      ORDER BY score DESC
      LIMIT 1
    `;

    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      const score = bestMatch.score;

      if (score >= FUZZY_AUTO_MERGE_THRESHOLD) {
        logger.debug(`[FUZZY] Auto-merge match (${score.toFixed(2)}) for ${item.normalized_name}`);
        product = (await prisma.product.findUnique({ where: { id: bestMatch.id } })) || undefined;
        if (product) {
          // Update matching metadata
          await prisma.product.update({
            where: { id: product.id },
            data: { matchingMethod: 'FUZZY', matchingConfidence: score, matchedAt: new Date() }
          });
          await this.createAlias(product.id, platformId, item);
          this.deterministicCache.set(detKey, product); // Update cache for subsequent items in batch
          return product;
        }
      } else if (score >= FUZZY_AI_VERIFY_THRESHOLD) {
        // AI Verification
        logger.debug(`[FUZZY] Medium similarity (${score.toFixed(2)}), falling back to AI for ${item.normalized_name}`);
        const aiMatchedProduct = await this.aiVerification(item, bestMatch.id, platformId);
        if (aiMatchedProduct) {
          this.deterministicCache.set(detKey, aiMatchedProduct);
          return aiMatchedProduct;
        }
      }
    }

    // 4. Complete Fallback: Create new product if AI didn't merge
    const newProduct = await this.createNewProduct(item, platformId);
    this.deterministicCache.set(detKey, newProduct);
    return newProduct;
  }

  private async aiVerification(item: NormalizedProduct, targetProductId: string, platformId: string): Promise<Product | null> {
    try {
      const targetProduct = await prisma.product.findUnique({ where: { id: targetProductId } });
      if (!targetProduct) return null;

      // Ensure API key is set for AI
      if (!process.env.GEMINI_API_KEY) {
         logger.warn('No GEMINI_API_KEY found, skipping AI verification');
         return null;
      }

      // Generate embedding for current product string
      const sourceStr = `${item.brand || ''} ${item.display_name} ${item.quantity || ''} ${item.unit || ''}`.trim();
      const targetStr = `${targetProduct.brand || ''} ${targetProduct.display_name} ${targetProduct.quantity || ''} ${targetProduct.unit || ''}`.trim();

      const [resSource, resTarget] = await Promise.all([
        ai.models.embedContent({ model: 'gemini-embedding-2', contents: sourceStr, config: { outputDimensionality: 768 } }),
        ai.models.embedContent({ model: 'gemini-embedding-2', contents: targetStr, config: { outputDimensionality: 768 } })
      ]);
      
      const sourceVec = resSource.embeddings?.[0]?.values;
      const targetVec = resTarget.embeddings?.[0]?.values;

      if (!sourceVec || !targetVec) return null;

      // Cosine similarity
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < sourceVec.length; i++) {
        dotProduct += sourceVec[i] * targetVec[i];
        normA += sourceVec[i] * sourceVec[i];
        normB += targetVec[i] * targetVec[i];
      }
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

      if (similarity >= AI_AUTO_MERGE_THRESHOLD) {
        logger.debug(`[AI] Auto-merge match (${similarity.toFixed(2)}) for ${item.normalized_name}`);
        await prisma.product.update({
          where: { id: targetProduct.id },
          data: { matchingMethod: 'AI', matchingConfidence: similarity, matchedAt: new Date() }
        });
        await this.createAlias(targetProduct.id, platformId, item);
        return targetProduct;
      } 
      
      if (similarity >= AI_REVIEW_THRESHOLD) {
        logger.debug(`[AI] Review queued (${similarity.toFixed(2)}) for ${item.normalized_name}`);
        // Create a new product but queue for review
        const newProduct = await this.createNewProduct(item, platformId, sourceVec);
        
        await prisma.productMatchReview.create({
          data: {
            sourceProductId: newProduct.id,
            targetProductId: targetProduct.id,
            confidenceScore: similarity,
            matchingReason: 'AI Similarity in Review range',
            matchingStrategy: 'AI'
          }
        });

        return newProduct;
      }

      // If AI similarity is low, we return null to proceed with creating a completely new product
      logger.debug(`[AI] Low similarity (${similarity.toFixed(2)}), treating as different product`);
      return null;
    } catch (error: any) {
      logger.error(`AI Verification failed for ${item.normalized_name}`, { error: error.message });
      return null;
    }
  }

  private async createNewProduct(item: NormalizedProduct, platformId: string, precalculatedVector?: number[]): Promise<Product> {
    logger.debug(`[CREATE] Creating new product for ${item.normalized_name}`);
    const product = await prisma.product.create({
      data: {
        normalized_name: item.normalized_name,
        display_name: item.display_name,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        canonical_image_url: item.canonical_image_url,
        category: item.category === 'GROCERY' ? 'GROCERY' : 'OTHER'
      }
    });

    if (precalculatedVector) {
      // Postgres vector array syntax: '[1,2,3]'
      const vectorStr = `[${precalculatedVector.join(',')}]`;
      await prisma.$executeRawUnsafe(`UPDATE "Product" SET embedding = '${vectorStr}'::vector WHERE id = '${product.id}'`);
    } else if (process.env.GEMINI_API_KEY) {
      // Async fire and forget embedding creation for future matches
      const str = `${item.brand || ''} ${item.display_name} ${item.quantity || ''} ${item.unit || ''}`.trim();
      ai.models.embedContent({ model: 'gemini-embedding-2', contents: str, config: { outputDimensionality: 768 } })
        .then(res => {
          const vec = res.embeddings?.[0]?.values;
          if (vec) {
            const vectorStr = `[${vec.join(',')}]`;
            prisma.$executeRawUnsafe(`UPDATE "Product" SET embedding = '${vectorStr}'::vector WHERE id = '${product.id}'`)
              .catch(e => logger.error(`Failed to save embedding for ${product.id}`, { error: e.message }));
          }
        })
        .catch(e => logger.error(`Failed to generate embedding for ${product.id}`, { error: e.message }));
    }

    await this.createAlias(product.id, platformId, item);
    return product;
  }

  private async createAlias(productId: string, platformId: string, item: NormalizedProduct) {
    await prisma.productAlias.upsert({
      where: {
        platformId_platformProductId: {
          platformId,
          platformProductId: item.platformProductId
        }
      },
      update: {
        platformTitle: item.display_name,
        normalizedTitle: item.normalized_name
      },
      create: {
        productId,
        platformId,
        platformProductId: item.platformProductId,
        platformTitle: item.display_name,
        normalizedTitle: item.normalized_name
      }
    });
  }
}
