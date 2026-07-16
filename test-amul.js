const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres.zkgnwiukdtuiptnfluos:Anish@5676@1987@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const res = await c.query(`
    SELECT pr.id, pr.display_name, pl.name as platform, l."platformProductId"
    FROM "Product" pr
    JOIN "Listing" l ON pr.id = l."productId"
    JOIN "Platform" pl ON l."platformId" = pl.id
    WHERE pr.display_name ILIKE '%Amul%Gold%'
  `);
  console.table(res.rows);
  
  const allMilk = await c.query(`
    SELECT pr.id, pr.display_name, pl.name as platform 
    FROM "Product" pr
    JOIN "Listing" l ON pr.id = l."productId"
    JOIN "Platform" pl ON l."platformId" = pl.id
    WHERE pr.display_name ILIKE '%milk%'
  `);
  console.log('All milk listings:', allMilk.rows.length);
  await c.end();
}
run();
