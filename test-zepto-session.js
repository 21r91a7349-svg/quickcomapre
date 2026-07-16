const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({
    geolocation: { latitude: 19.0760, longitude: 72.8777 },
    permissions: ['geolocation']
  });
  const p = await c.newPage();
  
  await p.goto('https://www.zeptonow.com/', { waitUntil: 'domcontentloaded' });
  
  await p.click('text=Select Location', { timeout: 5000 }).catch(() => null);
  await p.click('text=Auto Detect', { timeout: 3000 }).catch(() => null);
  await p.click('text=Use current location').catch(() => null);
  await p.waitForTimeout(4000);
  
  let searchApiHit = false;
  let searchResponseData = null;
  
  p.on('response', async r => {
    const url = r.url();
    if(url.includes('bff') && url.includes('search')) {
      searchApiHit = true;
      searchResponseData = await r.json().catch(()=>null);
    }
  });

  console.log('Navigating to search page directly with session active...');
  await p.goto('https://www.zeptonow.com/search?q=milk', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  
  // Try extracting products from DOM
  const products = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/pn/"]'));
    return links.map(link => link.innerText.replace(/\\n/g, ' ').trim());
  });
  
  console.log('DOM Products found:', products.length);
  if(products.length > 0) console.log('First:', products[0].substring(0,100));
  
  console.log('Did it hit a backend search API?', searchApiHit);
  
  await b.close();
})();
