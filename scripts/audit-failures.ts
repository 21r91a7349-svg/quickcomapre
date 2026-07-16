import 'dotenv/config';
import { prisma } from '../src/scraper/core/db';
import { ProductMatcher } from '../src/scraper/core/matcher';

async function auditFailures() {
    const matcher: any = new ProductMatcher();
    const batch = await prisma.product.findMany({
        orderBy: { id: 'asc' }
    });

    for (const product of batch) {
        const fuzzyCandidates: any[] = await prisma.$queryRaw`
            SELECT id, similarity(normalized_name, ${product.normalized_name}) as trigram_score
            FROM "Product"
            WHERE id != ${product.id}
              AND similarity(normalized_name, ${product.normalized_name}) > 0.4
            ORDER BY trigram_score DESC
            LIMIT 5
        `;

        if (fuzzyCandidates.length === 0) continue;

        const candidateIds = fuzzyCandidates.map(c => c.id);
        const dbCandidates = await prisma.product.findMany({ where: { id: { in: candidateIds } } });

        for (const candidate of dbCandidates) {
            if (candidate.createdAt > product.createdAt) continue;
            
            const guard = matcher.checkGuardrails(product as any, candidate);
            if (!guard.pass) {
                const trigramScore = fuzzyCandidates.find(c => c.id === candidate.id)?.trigram_score || 0;
                if (trigramScore > 0.6) {
                    console.log(`Guardrail Rejected: ${product.display_name} [${product.brand}] -> ${candidate.display_name} [${candidate.brand}] | Reason: ${guard.reason}`);
                }
            }
        }
    }
}

auditFailures().catch(console.error).finally(() => process.exit(0));
