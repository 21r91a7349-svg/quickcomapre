import fs from 'fs';

async function main() {
  const res = await fetch('http://localhost:3000/api/products/cmrmizkb00001zkf09yypaug9/history');
  const data = await res.json();
  fs.writeFileSync('price_history_output.json', JSON.stringify(data, null, 2));
  console.log("Successfully fetched and saved price history to price_history_output.json");
  console.log("Platforms found:", data.platforms);
  console.log("Stats:", data.stats);
  console.log("Number of data points:", data.chartData.length);
}

main().catch(console.error);
