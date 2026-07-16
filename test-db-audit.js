const { Client } = require('pg');

async function runDatabaseAudit() {
  const connectionString = 'postgresql://postgres.zkgnwiukdtuiptnfluos:Anish@5676@1987@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('=========================================================');
    console.log('Stage 4: Database Audit');
    console.log('=========================================================');

    // Counts
    const productCount = await client.query('SELECT COUNT(*) FROM "Product"');
    const listingCount = await client.query('SELECT COUNT(*) FROM "Listing"');
    const priceHistoryCount = await client.query('SELECT COUNT(*) FROM "PriceHistory"');
    const aliasCount = await client.query('SELECT COUNT(*) FROM "ProductAlias"');
    
    console.log(`Product table: ${productCount.rows[0].count} rows`);
    console.log(`Listing table: ${listingCount.rows[0].count} rows`);
    console.log(`PriceHistory table: ${priceHistoryCount.rows[0].count} rows`);
    console.log(`ProductAlias table: ${aliasCount.rows[0].count} rows\n`);

    const platformDistribution = await client.query(`
      SELECT p.name as platform, COUNT(l.id) as listings
      FROM "Platform" p
      LEFT JOIN "Listing" l ON p.id = l."platformId"
      GROUP BY p.name
      ORDER BY listings DESC
    `);
    
    console.log('Platform distribution:');
    for (const row of platformDistribution.rows) {
      console.log(`${row.platform}\nListings: ${row.listings}\n`);
    }

    // Example listings for Milk
    const milkListings = await client.query(`
      SELECT pr.display_name, pl.name as platform, l."currentPrice"
      FROM "Listing" l
      JOIN "Product" pr ON l."productId" = pr.id
      JOIN "Platform" pl ON l."platformId" = pl.id
      WHERE pr.display_name ILIKE '%milk%'
      LIMIT 10
    `);
    
    console.log('Example Milk Listings:');
    console.table(milkListings.rows);

    console.log('\n=========================================================');
    console.log('Stage 5: Product Matching Audit');
    console.log('=========================================================');
    
    const amulGold = await client.query(`
      SELECT pr.id, pr.display_name, pr."canonical_image_url"
      FROM "Product" pr
      WHERE pr.display_name ILIKE '%Amul%Gold%Milk%'
      LIMIT 1
    `);
    
    if (amulGold.rows.length > 0) {
      const prod = amulGold.rows[0];
      console.log('Canonical Product:');
      console.log(prod);
      
      const listings = await client.query(`
        SELECT pl.name as platform, l."platformProductId", l."currentPrice", l."imageUrl", l."productUrl"
        FROM "Listing" l
        JOIN "Platform" pl ON l."platformId" = pl.id
        WHERE l."productId" = $1
      `, [prod.id]);
      
      console.log('\nListings attached:');
      console.table(listings.rows);
      
      const aliases = await client.query(`
        SELECT pl.name as platform, a."platformTitle", a."normalizedTitle"
        FROM "ProductAlias" a
        JOIN "Platform" pl ON a."platformId" = pl.id
        WHERE a."productId" = $1
      `, [prod.id]);
      
      console.log('\nAliases attached:');
      console.table(aliases.rows);
    } else {
      console.log('Amul Gold Milk not found as a canonical product.');
      
      // Let's just find ANY product that has listings on Blinkit
      const anyBlinkit = await client.query(`
        SELECT pr.id, pr.display_name
        FROM "Listing" l
        JOIN "Product" pr ON l."productId" = pr.id
        JOIN "Platform" pl ON l."platformId" = pl.id
        WHERE pl.name = 'Blinkit'
        LIMIT 1
      `);
      if (anyBlinkit.rows.length > 0) {
        console.log('\nFound this product instead (has Blinkit listing):', anyBlinkit.rows[0]);
      }
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await client.end();
  }
}

runDatabaseAudit();
