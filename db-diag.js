const { Client } = require('pg');

async function runDiagnostics() {
  const connectionString = 'postgresql://postgres.zkgnwiukdtuiptnfluos:Anish%405676%401987@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
  console.log('Testing connection to Supabase pooler port 5432...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('SUCCESS: CONNECTED TO SUPABASE!');
    const p = await client.query('SELECT COUNT(*) FROM "Product";');
    const l = await client.query('SELECT COUNT(*) FROM "Listing";');
    const a = await client.query('SELECT COUNT(*) FROM "ProductAlias";');
    const h = await client.query('SELECT COUNT(*) FROM "PriceHistory";');
    
    console.log('Product Count:', p.rows[0].count);
    console.log('Listing Count:', l.rows[0].count);
    console.log('ProductAlias Count:', a.rows[0].count);
    console.log('PriceHistory Count:', h.rows[0].count);
    await client.end();
  } catch (e) {
    console.error('Failed:', e);
  }
}

runDiagnostics();
