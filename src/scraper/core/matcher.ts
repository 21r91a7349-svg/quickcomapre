import { GoogleGenAI } from '@google/genai';
import { prisma } from './db';
import { NormalizedProduct } from '../types';
import { ScraperLogger } from './logger';
import { Product, ProductAlias } from '@prisma/client';
import { MATCHER_CONFIG } from '../config/matcher';
import { SYNONYMS_DICTIONARY, STOP_WORDS_SET } from '../config/synonyms';

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
    
    // Apply synonyms dictionary
    for (const [synonym, replacement] of Object.entries(SYNONYMS_DICTIONARY)) {
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
      tokens = tokens.filter(t => !STOP_WORDS_SET.includes(t));
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
    }

    // 5. Variant Mismatch
    const itemVariants = MATCHER_CONFIG.variantGroups.filter(v => item.normalized_name.toLowerCase().includes(v));
    const candVariants = MATCHER_CONFIG.variantGroups.filter(v => candidate.normalized_name.toLowerCase().includes(v));
    if (itemVariants.length > 0 && candVariants.length > 0) {
      const intersection = itemVariants.filter(v => candVariants.includes(v));
      if (intersection.length === 0) return { pass: false, reason: 'Variant mismatch' };
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

  /**
   * Calculates an explainable Evidence Score from:
   * - Similarity (Token + Trigram)
   * - Brand Match
   * - Quantity/Unit Match
   * - Alias Match
   * - Platform Agreement
   */
  calculateEvidenceScore(item: NormalizedProduct, candidate: Product, trigramScore: number): {
    evidenceScore: number;
    decision: 'AUTO_MERGE' | 'REVIEW' | 'REJECT';
    breakdown: any;
  } {
    const candNorm = this.normalizeString(candidate.normalized_name);
    const itemNorm = this.normalizeString(item.normalized_name);
    const tokenScore = this.calculateTokenOverlap(itemNorm, candNorm);
    const similarity = (tokenScore * 0.5) + (trigramScore * 0.5);

    // Brand Match Component (0.25 weight)
    const itemBrand = item.brand ? this.normalizeString(item.brand) : null;
    const candBrand = candidate.brand ? this.normalizeString(candidate.brand) : null;
    let brandMatch = 0.5;
    if (itemBrand && candBrand) {
      brandMatch = itemBrand === candBrand ? 1.0 : 0.0;
    }

    // Quantity Match Component (0.20 weight)
    const normItem = this.normalizeQuantity(item.quantity, item.unit);
    const normCand = this.normalizeQuantity(candidate.quantity, candidate.unit);
    let quantityMatch = 0.5;
    if (normItem.qty !== null && normCand.qty !== null) {
      quantityMatch = (normItem.qty === normCand.qty && normItem.unit === normCand.unit) ? 1.0 : 0.0;
    }

    // Alias Match Component (0.10 weight)
    const aliasMatch = this.aliasCache.has(item.platformProductId) ? 1.0 : 0.0;

    // Platform Agreement Component (0.10 weight)
    const platformAgreement = 1.0;

    // Total Explainable Evidence Score
    const evidenceScore = Number((
      (similarity * 0.35) +
      (brandMatch * 0.25) +
      (quantityMatch * 0.20) +
      (aliasMatch * 0.10) +
      (platformAgreement * 0.10)
    ).toFixed(3));

    let decision: 'AUTO_MERGE' | 'REVIEW' | 'REJECT' = 'REJECT';
    if (evidenceScore >= 0.80 || (brandMatch === 1.0 && quantityMatch === 1.0 && similarity >= 0.50)) {
      decision = 'AUTO_MERGE';
    } else if (evidenceScore >= 0.65) {
      decision = 'REVIEW';
    }

    return {
      evidenceScore,
      decision,
      breakdown: {
        similarity: Number(similarity.toFixed(3)),
        tokenScore: Number(tokenScore.toFixed(3)),
        trigramScore: Number(trigramScore.toFixed(3)),
        brandMatch,
        quantityMatch,
        aliasMatch,
        platformAgreement,
        evidenceScore
      }
    };
  }

  async matchOrCreateProduct(item: NormalizedProduct, platformId: string): Promise<{ product: Product; isNew: boolean }> {
    // 1. Alias Match (Fastest & highest confidence)
    if (this.aliasCache.has(item.platformProductId)) {
      return { product: this.aliasCache.get(item.platformProductId)!, isNew: false };
    }

    const normalizedName = this.normalizeString(item.normalized_name);
    
    // 2. Candidate Generation via similarity trigram query
    const fuzzyCandidates: any[] = await prisma.$queryRaw`
      SELECT id, similarity(normalized_name, ${item.normalized_name}) as trigram_score
      FROM "Product"
      WHERE similarity(normalized_name, ${item.normalized_name}) > 0.3
      ORDER BY trigram_score DESC
      LIMIT 10
    `;

    if (fuzzyCandidates.length > 0) {
      const candidateIds = fuzzyCandidates.map(c => c.id);
      const dbCandidates = await prisma.product.findMany({ where: { id: { in: candidateIds } } });

      let bestScore = -1;
      let bestCandidate: Product | null = null;
      let bestBreakdown: any = null;
      let bestDecision: 'AUTO_MERGE' | 'REVIEW' | 'REJECT' = 'REJECT';

      for (const candidate of dbCandidates) {
        const trigramScore = fuzzyCandidates.find(c => c.id === candidate.id)?.trigram_score || 0;

        // Guardrails Check
        const guard = this.checkGuardrails(item, candidate);
        if (!guard.pass) {
          logger.debug(`Rejecting candidate ${candidate.normalized_name} for ${item.normalized_name}: ${guard.reason}`);
          continue;
        }

        // Calculate Evidence Score
        const ev = this.calculateEvidenceScore(item, candidate, trigramScore);

        if (ev.evidenceScore > bestScore) {
          bestScore = ev.evidenceScore;
          bestCandidate = candidate;
          bestBreakdown = ev.breakdown;
          bestDecision = ev.decision;
        }
      }

      if (bestCandidate && bestBreakdown) {
        if (bestDecision === 'AUTO_MERGE') {
          await this.createAlias(bestCandidate.id, platformId, item);
          await prisma.productMatchReview.create({
            data: {
              sourceProductId: bestCandidate.id,
              targetProductId: bestCandidate.id,
              confidenceScore: bestScore,
              matchingReason: JSON.stringify(bestBreakdown),
              matchingStrategy: 'EVIDENCE_SCORE',
              status: 'APPROVED'
            }
          }).catch(() => {});
          return { product: bestCandidate, isNew: false };
        } else if (bestDecision === 'REVIEW') {
          // Send to review queue without creating duplicate canonical cards for search
          await this.createAlias(bestCandidate.id, platformId, item);
          await prisma.productMatchReview.create({
            data: {
              sourceProductId: bestCandidate.id,
              targetProductId: bestCandidate.id,
              confidenceScore: bestScore,
              matchingReason: JSON.stringify(bestBreakdown),
              matchingStrategy: 'EVIDENCE_SCORE',
              status: 'PENDING'
            }
          }).catch(() => {});
          return { product: bestCandidate, isNew: false };
        }
      }
    }

    // 3. Create completely new canonical product
    const newProduct = await this.createNewProduct(item, platformId);
    return { product: newProduct, isNew: true };
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

  /**
   * Consolidate duplicate canonical products that share equivalent brand + quantity
   */
  async consolidateDuplicateCanonicals(): Promise<{ mergedCount: number }> {
    logger.info('Starting safe canonical product consolidation...');
    const allProducts = await prisma.product.findMany({
      include: { listings: true }
    });

    const groups = new Map<string, Product[]>();
    allProducts.forEach(p => {
      const b = p.brand ? this.normalizeString(p.brand) : 'unbranded';
      const q = p.quantity ? Number(p.quantity) : 0;
      const u = p.unit ? p.unit.toLowerCase() : 'unit';
      const norm = this.normalizeString(p.normalized_name);
      
      // Only group by brand+qty if quantity > 0, otherwise group strictly by normalized name
      const key = q > 0 ? `${b}::${q}::${u}` : `exact::${norm}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });

    let mergedCount = 0;
    for (const [key, prodList] of groups.entries()) {
      if (prodList.length > 1) {
        prodList.sort((a, b) => (b as any).listings.length - (a as any).listings.length);
        const target = prodList[0];
        const duplicates = prodList.slice(1);

        for (const dup of duplicates) {
          // Additional safety check: Ensure token overlap >= 0.50 before merging
          const sim = this.calculateTokenOverlap(this.normalizeString(target.normalized_name), this.normalizeString(dup.normalized_name));
          if (sim < 0.50 && target.normalized_name !== dup.normalized_name) {
            logger.debug(`Skipping consolidation for "${dup.display_name}" and "${target.display_name}" due to low similarity (${sim})`);
            continue;
          }

          logger.info(`Consolidating duplicate product "${dup.display_name}" (${dup.id}) into canonical "${target.display_name}" (${target.id})`);
          
          // Re-assign listings to target canonical
          await prisma.listing.updateMany({
            where: { productId: dup.id },
            data: { productId: target.id }
          });

          // Re-assign aliases
          await prisma.productAlias.updateMany({
            where: { productId: dup.id },
            data: { productId: target.id }
          });

          // Delete duplicate canonical product entry
          await prisma.product.delete({ where: { id: dup.id } }).catch(() => {});
          mergedCount++;
        }
      }
    }

    logger.info(`Consolidation complete. Merged ${mergedCount} duplicate canonical products.`);
    return { mergedCount };
  }
}
