const { Client } = require('pg');

async function runDiagnostics() {
  const connectionString = 'postgresql://postgres.zkgnwiukdtuiptnfluos:Anish@5676@1987@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- DATABASE DIAGNOSTIC REPORT ---\n');

    // 1. Product Table Columns
    console.log('1. Product Table Schema:');
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Product'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);

    // 2. Table Existence
    console.log('\n2. Missing Tables Check:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('ProductAlias', 'ProductMatchReview', 'PriceAlert');
    `);
    console.table(tables.rows);

    // 3. Extensions
    console.log('\n3. PostgreSQL Extensions:');
    const exts = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('pg_trgm', 'vector');
    `);
    console.table(exts.rows);

    // 4. Row Counts
    console.log('\n4. Row Counts:');
    const productCount = await client.query('SELECT COUNT(*) FROM "Product";');
    const listingCount = await client.query('SELECT COUNT(*) FROM "Listing";');
    const priceHistoryCount = await client.query('SELECT COUNT(*) FROM "PriceHistory";');
    
    console.table([
      { Table: 'Product', Count: productCount.rows[0].count },
      { Table: 'Listing', Count: listingCount.rows[0].count },
      { Table: 'PriceHistory', Count: priceHistoryCount.rows[0].count },
    ]);

  } catch (error) {
    console.error('Diagnostic failed:', error);
  } finally {
    await client.end();
  }
}

runDiagnostics();
