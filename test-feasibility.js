const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const fs = require('fs');

async function testPlatform(name, url, searchAction) {
  console.log(`\\n--- Testing ${name} ---`);
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({
    geolocation: { latitude: 19.0760, longitude: 72.8777 },
    permissions: ['geolocation']
  });
  const p = await c.newPage();
  
  let wafBlocked = false;
  let searchApis = [];
  
  p.on('response', async r => {
    const status = r.status();
    const headers = r.headers();
    const rUrl = r.url();
    
    // Detect WAF blocks
    if (status === 403 || status === 429) {
      if(headers['server']?.includes('cloudflare') || headers['server']?.includes('akamai')) {
        console.log(`[WAF] Blocked on ${rUrl} (Status: ${status}) by ${headers['server']}`);
        wafBlocked = true;
      }
    }
    
    // Log potential search APIs
    if (rUrl.includes('search') || rUrl.includes('query') || rUrl.includes('graphql')) {
      if(!rUrl.includes('.js') && !rUrl.includes('.css') && !rUrl.includes('.png')) {
        searchApis.push(rUrl);
      }
    }
  });

  try {
    const navRes = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`${name} Initial Status:`, navRes ? navRes.status() : 'Unknown');
    
    await searchAction(p);
    
    await p.waitForTimeout(5000); // let API calls settle
    
  } catch(e) {
    console.log(`${name} Error:`, e.message);
  }

  console.log(`Search APIs found:`, searchApis);
  
  await b.close();
}

(async () => {
  // Test BigBasket
  await testPlatform('BigBasket', 'https://www.bigbasket.com/', async (p) => {
    await p.click('text=Use current location').catch(() => null);
    await p.waitForTimeout(2000);
    // Focus search and type
    const searchInput = await p.$('input[placeholder*="Search"], input[type="text"]');
    if(searchInput) {
      await searchInput.type('milk');
      await p.keyboard.press('Enter');
    } else {
      console.log('BigBasket search input not found');
    }
  });

  // Test Swiggy Instamart
  await testPlatform('Swiggy Instamart', 'https://www.swiggy.com/instamart', async (p) => {
    await p.click('text=Locate Me').catch(() => null);
    await p.waitForTimeout(2000);
    const searchBtn = await p.$('text=Search, div:has-text("Search")');
    if(searchBtn) {
        await searchBtn.click().catch(()=>null);
        await p.waitForTimeout(1000);
    }
    const searchInput = await p.$('input[placeholder*="Search"], input[type="text"]');
    if(searchInput) {
      await searchInput.type('milk');
      await p.keyboard.press('Enter');
    } else {
      console.log('Swiggy search input not found');
    }
  });
})();
