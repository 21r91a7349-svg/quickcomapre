import 'dotenv/config';
import { prisma } from '../src/scraper/core/db';
import { ProductMatcher } from '../src/scraper/core/matcher';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log('=========================================================');
  console.log(`CANONICAL PRODUCT CONSOLIDATION TOOL ${isDryRun ? '[DRY RUN MODE]' : '[EXECUTION MODE]'}`);
  console.log('=========================================================\n');

  const matcher = new ProductMatcher();

  if (isDryRun) {
    console.log('Performing dry-run audit of duplicate canonical products...');
    const allProducts = await prisma.product.findMany({
      include: { listings: true }
    });

    const groups = new Map<string, typeof allProducts>();
    allProducts.forEach(p => {
      const b = p.brand ? p.brand.toLowerCase().trim() : 'unbranded';
      const q = p.quantity ? Number(p.quantity) : 0;
      const u = p.unit ? p.unit.toLowerCase().trim() : 'unit';
      const key = q > 0 ? `${b}::${q}::${u}` : `name::${p.normalized_name}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });

    let duplicateGroupsCount = 0;
    let potentialMergesCount = 0;

    for (const [key, prodList] of groups.entries()) {
      if (prodList.length > 1) {
        duplicateGroupsCount++;
        const target = prodList[0];
        const duplicates = prodList.slice(1);
        console.log(`\nFound Duplicate Group [${key}]:`);
        console.log(`- Target Canonical: "${target.display_name}" (${target.id}) [${target.listings.length} listings]`);
        duplicates.forEach(dup => {
          console.log(`  └ Candidate Duplicate: "${dup.display_name}" (${dup.id}) [${dup.listings.length} listings]`);
          potentialMergesCount++;
        });
      }
    }

    console.log('\n---------------------------------------------------------');
    console.log(`Dry Run Audit Summary:`);
    console.log(`- Duplicate Groups Found: ${duplicateGroupsCount}`);
    console.log(`- Potential Merges Identified: ${potentialMergesCount}`);
    console.log('No changes were made to the database. Run without --dry-run to apply.');
    console.log('---------------------------------------------------------\n');
  } else {
    console.log('Executing safe database consolidation...');
    const result = await matcher.consolidateDuplicateCanonicals();
    console.log(`\nConsolidation Complete! Merged ${result.mergedCount} duplicate products.`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
