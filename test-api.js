const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- API AUDIT ---');
  for (const query of ['milk', 'rice', 'onion']) {
    console.log(`\nQuery: ${query}`);
    const start = Date.now();
    const result = await fetchJson(`https://quickcomapre.onrender.com/api/search?q=${query}`);
    const time = Date.now() - start;
    
    console.log(`Status: ${result.status} (${time}ms)`);
    if (result.status === 200 && result.data.results) {
      console.log(`Total Products: ${result.data.results.length}`);
      
      const sample = result.data.results.slice(0, 5);
      for (const p of sample) {
        const platforms = p.listings.map(l => l.platform.name).join(', ');
        console.log(`- ${p.display_name} | Listings: ${p.listings.length} (${platforms})`);
      }
    } else {
      console.log('Error/No Data:', result.data);
    }
  }
}

run();
