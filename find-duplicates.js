const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres.zkgnwiukdtuiptnfluos:Anish@5676@1987@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  
  // Find products that are suspiciously similar but ended up as separate products
  const res = await c.query(`
    SELECT p1.id as id1, p1.display_name as name1, p1.brand as brand1, 
           p2.id as id2, p2.display_name as name2, p2.brand as brand2,
           similarity(p1.normalized_name, p2.normalized_name) as score
    FROM "Product" p1
    JOIN "Product" p2 ON p1.id < p2.id
    WHERE similarity(p1.normalized_name, p2.normalized_name) > 0.6
      AND (p1.quantity = p2.quantity OR p1.quantity IS NULL OR p2.quantity IS NULL)
      AND (p1.unit = p2.unit OR p1.unit IS NULL OR p2.unit IS NULL)
    ORDER BY score DESC
    LIMIT 100
  `);
  
  console.log('Failed Matches Dataset (Duplicate Products):');
  let count = 0;
  for (const row of res.rows) {
    // Check if they are actually the same semantic product
    if (row.name1 !== row.name2) {
      console.log(`\nMatch ${++count}: Score ${row.score}`);
      console.log(`Product A: ${row.name1} (${row.brand1 || 'No Brand'})`);
      console.log(`Product B: ${row.name2} (${row.brand2 || 'No Brand'})`);
    }
  }
  
  await c.end();
}
run();
