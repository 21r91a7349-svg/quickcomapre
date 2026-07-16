import 'dotenv/config';
import { prisma } from '../src/scraper/core/db';

async function auditSQL() {
    const term = 'milk';
    const ftsTerm = 'milk';

    console.log(`\n================= EXPLAIN ANALYZE AUDIT =================`);
    
    // Test Exact Match
    const exact = await prisma.$queryRaw<any[]>`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id FROM "Product" WHERE normalized_name = ${term}
    `;
    console.log(`\n--- Exact Match ---`);
    exact.forEach(r => console.log(r['QUERY PLAN']));

    // Test Prefix
    const prefix = await prisma.$queryRaw<any[]>`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id FROM "Product" WHERE normalized_name LIKE ${term + '%'}
    `;
    console.log(`\n--- Prefix Match ---`);
    prefix.forEach(r => console.log(r['QUERY PLAN']));

    // Test FTS
    const fts = await prisma.$queryRaw<any[]>`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id FROM "Product" WHERE to_tsvector('english', display_name) @@ to_tsquery('english', ${ftsTerm})
    `;
    console.log(`\n--- FTS Match ---`);
    fts.forEach(r => console.log(r['QUERY PLAN']));

    // Test Trigram
    const trigram = await prisma.$queryRaw<any[]>`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id FROM "Product" WHERE similarity(normalized_name, ${term}) > 0.3
    `;
    console.log(`\n--- Trigram Match ---`);
    trigram.forEach(r => console.log(r['QUERY PLAN']));
}

auditSQL().catch(console.error).finally(() => process.exit(0));
