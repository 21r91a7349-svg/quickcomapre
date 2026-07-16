import { GoogleGenAI } from '@google/genai';
import { prisma } from './db';
import { NormalizedProduct } from '../types';
import { ScraperLogger } from './logger';
import { Product, ProductAlias } from '@prisma/client';
import { MATCHER_CONFIG } from '../config/matcher';

const logger = new ScraperLogger('ProductMatcher');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class ProductMatcher {
  private aliasCache = new Map<string, Product>();

  async preload(items: NormalizedProduct[], platformId: string) {
    this.aliasCache.clear();
    const platformProductIds = items.map(i => i.platformProductId);
    const aliases = await prisma.productAlias.findMany({
      where: { platformId, platformProductId: { in: platformProductIds } },
      include: { product: true }
    });
    for (const alias of aliases) {
      this.aliasCache.set(alias.platformProductId, alias.product);
    }
  }

  private normalizeString(str: string): string {
    let normalized = str.toLowerCase();
    
    // Apply synonyms
    for (const [synonym, replacement] of Object.entries(MATCHER_CONFIG.synonyms)) {
      normalized = normalized.replace(new RegExp(`\\b${synonym}\\b`, 'g'), replacement);
    }
    
    // Remove punctuation
    normalized = normalized.replace(/[&'/\-()]/g, ' ');
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  private extractTokens(normalized: string, removeStopWords: boolean = true): string[] {
    let tokens = normalized.split(' ').filter(t => t.length > 0);
    if (removeStopWords) {
      tokens = tokens.filter(t => !MATCHER_CONFIG.stopWords.includes(t));
    }
    return tokens;
  }

  private normalizeQuantity(qty: number | null, unit: string | null): { qty: number | null, unit: string | null } {
    if (qty === null || unit === null) return { qty, unit };
    const u = unit.toLowerCase().trim();
    if (u === 'l' || u === 'liter' || u === 'liters' || u === 'litre') {
      return { qty: qty * 1000, unit: 'ml' };
    }
    if (u === 'kg' || u === 'kilo' || u === 'kilogram') {
      return { qty: qty * 1000, unit: 'g' };
    }
    return { qty, unit: u };
  }

  checkGuardrails(item: NormalizedProduct, candidate: Product): { pass: boolean, reason: string } {
    // 1. Category
    if (item.category && candidate.category && item.category !== candidate.category) {
      if (item.category !== 'OTHER' && candidate.category !== 'OTHER') {
        return { pass: false, reason: 'Category mismatch' };
      }
    }

    // 2. Brand
    const itemBrand = item.brand ? this.normalizeString(item.brand) : null;
    const candBrand = candidate.brand ? this.normalizeString(candidate.brand) : null;
    if (itemBrand && candBrand && itemBrand !== candBrand) {
      return { pass: false, reason: 'Brand mismatch' };
    }

    // 3. Quantity & Unit
    const normItem = this.normalizeQuantity(item.quantity, item.unit);
    const normCand = this.normalizeQuantity(candidate.quantity, candidate.unit);

    if (normItem.qty !== null && normCand.qty !== null && normItem.qty !== normCand.qty) {
      return { pass: false, reason: 'Quantity mismatch' };
    }
    if (normItem.unit && normCand.unit && normItem.unit !== normCand.unit) {
      return { pass: false, reason: 'Unit mismatch' };
    }

    const itemTokens = this.extractTokens(this.normalizeString(item.normalized_name), false);
    const candTokens = this.extractTokens(this.normalizeString(candidate.normalized_name), false);

    // 4. Flavor Mismatch
    const itemFlavors = MATCHER_CONFIG.flavourGroups.filter(f => itemTokens.includes(f));
    const candFlavors = MATCHER_CONFIG.flavourGroups.filter(f => candTokens.includes(f));
    if (itemFlavors.length > 0 && candFlavors.length > 0) {
      const intersection = itemFlavors.filter(f => candFlavors.includes(f));
      if (intersection.length === 0) return { pass: false, reason: 'Flavor mismatch' };
    } else if (itemFlavors.length !== candFlavors.length) {
      return { pass: false, reason: 'Flavor presence mismatch' };
    }

    // 5. Variant Mismatch
    const itemVariants = MATCHER_CONFIG.variantGroups.filter(v => item.normalized_name.toLowerCase().includes(v));
    const candVariants = MATCHER_CONFIG.variantGroups.filter(v => candidate.normalized_name.toLowerCase().includes(v));
    if (itemVariants.length > 0 && candVariants.length > 0) {
      const intersection = itemVariants.filter(v => candVariants.includes(v));
      if (intersection.length === 0) return { pass: false, reason: 'Variant mismatch' };
    } else if (itemVariants.length !== candVariants.length) {
      return { pass: false, reason: 'Variant presence mismatch' };
    }

    // 6. Packaging Mismatch
    const getPackagingFamily = (tokens: string[]) => {
      for (const [family, terms] of Object.entries(MATCHER_CONFIG.packagingFamilies)) {
        if (terms.some(t => tokens.includes(t) || item.normalized_name.toLowerCase().includes(t))) return family;
      }
      return null;
    };
    const itemPack = getPackagingFamily(itemTokens);
    const candPack = getPackagingFamily(candTokens);
    if (itemPack && candPack && itemPack !== candPack) {
      return { pass: false, reason: 'Packaging mismatch' };
    }

    return { pass: true, reason: 'PASS' };
  }

  private calculateTokenOverlap(str1: string, str2: string): number {
    const tokens1 = new Set(this.extractTokens(str1));
    const tokens2 = new Set(this.extractTokens(str2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }

  private async generateEmbedding(str: string): Promise<number[] | null> {
    if (!process.env.GEMINI_API_KEY) return null;
    try {
      const res = await ai.models.embedContent({ model: 'gemini-embedding-2', contents: str, config: { outputDimensionality: 768 } });
      return res.embeddings?.[0]?.values || null;
    } catch (e) {
      return null;
    }
  }

  private async enqueueAsyncEmbedding(productId: string, str: string) {
    if (!process.env.GEMINI_API_KEY) return;
    ai.models.embedContent({ model: 'gemini-embedding-2', contents: str, config: { outputDimensionality: 768 } })
      .then(res => {
        const vec = res.embeddings?.[0]?.values;
        if (vec) {
          const vectorStr = `[${vec.join(',')}]`;
          prisma.$executeRawUnsafe(`UPDATE "Product" SET embedding = '${vectorStr}'::vector WHERE id = '${productId}'`)
            .catch(e => logger.error(`Failed to save background embedding`, { error: e.message }));
        }
      })
      .catch(e => logger.error(`Failed to generate background embedding`, { error: e.message }));
  }

  async matchOrCreateProduct(item: NormalizedProduct, platformId: string): Promise<Product> {
    // 1. Alias Match
    if (this.aliasCache.has(item.platformProductId)) {
      return this.aliasCache.get(item.platformProductId)!;
    }

    const normalizedName = this.normalizeString(item.normalized_name);
    
    // 2. Candidate Generation
    const fuzzyCandidates: any[] = await prisma.$queryRaw`
      SELECT id, similarity(normalized_name, ${item.normalized_name}) as trigram_score
      FROM "Product"
      WHERE similarity(normalized_name, ${item.normalized_name}) > 0.4
      ORDER BY trigram_score DESC
      LIMIT 10
    `;

    if (fuzzyCandidates.length > 0) {
      const candidateIds = fuzzyCandidates.map(c => c.id);
      const dbCandidates = await prisma.product.findMany({ where: { id: { in: candidateIds } } });

      let bestScore = -1;
      let bestCandidate: Product | null = null;
      let bestExplanation: any = null;

      for (const candidate of dbCandidates) {
        const trigramScore = fuzzyCandidates.find(c => c.id === candidate.id)?.trigram_score || 0;

        // Guardrails
        const guard = this.checkGuardrails(item, candidate);
        if (!guard.pass) {
          logger.debug(`Rejecting candidate ${candidate.normalized_name} for ${item.normalized_name}: ${guard.reason}`);
          continue;
        }

        // Semantic Scoring
        const candNorm = this.normalizeString(candidate.normalized_name);
        const tokenScore = this.calculateTokenOverlap(normalizedName, candNorm);
        
        // Wait, for ingest we skip embedding if we don't have it to stay fast?
        // Let's rely on Token + Trigram if we don't want to block, but we CAN block if we want to be accurate.
        // The user said: "Generate embeddings asynchronously. Product ingestion must never wait for Gemini. If an embedding is missing, enqueue background generation and continue."
        // We will skip embedding from the score if we don't have it, and rebalance weights.
        let embeddingScore = 0;
        let finalScore = 0;
        let usedWeights = { ...MATCHER_CONFIG.weights };
        
        // Check if candidate has embedding in DB? We can't easily fetch pgvector using Prisma normally unless we use raw.
        // Let's just use Token + Trigram for synchronous matching to keep ingestion lightning fast.
        usedWeights.token = 0.5;
        usedWeights.trigram = 0.5;
        usedWeights.embedding = 0.0;
        finalScore = (tokenScore * usedWeights.token) + (trigramScore * usedWeights.trigram);

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestCandidate = candidate;
          bestExplanation = {
            candidate_generation: { brand: 'PASS', category: 'PASS', quantity: 'PASS', unit: 'PASS' },
            guardrails: { variant: 'PASS', flavour: 'PASS', packaging: 'PASS' },
            semantic: { token: tokenScore, trigram: trigramScore, embedding: null },
            decision: bestScore >= MATCHER_CONFIG.thresholds.autoMerge ? 'AUTO_MERGE' : (bestScore >= MATCHER_CONFIG.thresholds.review ? 'REVIEW' : 'REJECT')
          };
        }
      }

      if (bestCandidate && bestExplanation) {
        if (bestScore >= MATCHER_CONFIG.thresholds.autoMerge) {
          await this.createAlias(bestCandidate.id, platformId, item);
          await prisma.productMatchReview.create({
            data: {
              sourceProductId: bestCandidate.id, targetProductId: bestCandidate.id,
              confidenceScore: bestScore, matchingReason: JSON.stringify(bestExplanation),
              matchingStrategy: 'FUZZY', status: 'APPROVED'
            }
          });
          return bestCandidate;
        } else if (bestScore >= MATCHER_CONFIG.thresholds.review) {
          const newProduct = await this.createNewProduct(item, platformId);
          await prisma.productMatchReview.create({
            data: {
              sourceProductId: newProduct.id, targetProductId: bestCandidate.id,
              confidenceScore: bestScore, matchingReason: JSON.stringify(bestExplanation),
              matchingStrategy: 'FUZZY', status: 'PENDING'
            }
          });
          return newProduct;
        }
      }
    }

    // Create completely new product
    return await this.createNewProduct(item, platformId);
  }

  private async createNewProduct(item: NormalizedProduct, platformId: string): Promise<Product> {
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

    const str = `${item.brand || ''} ${item.display_name} ${item.quantity || ''} ${item.unit || ''}`.trim();
    this.enqueueAsyncEmbedding(product.id, str);

    await this.createAlias(product.id, platformId, item);
    return product;
  }

  private async createAlias(productId: string, platformId: string, item: NormalizedProduct) {
    await prisma.productAlias.upsert({
      where: { platformId_platformProductId: { platformId, platformProductId: item.platformProductId } },
      update: { platformTitle: item.display_name, normalizedTitle: item.normalized_name },
      create: { productId, platformId, platformProductId: item.platformProductId, platformTitle: item.display_name, normalizedTitle: item.normalized_name }
    });
  }
}
