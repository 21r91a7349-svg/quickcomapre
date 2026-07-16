const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  
  await p.goto('https://www.swiggy.com/instamart', {waitUntil: 'domcontentloaded'});
  
  const html = await p.evaluate(() => document.documentElement.innerHTML);
  console.log('Swiggy has NEXT_DATA:', html.includes('__NEXT_DATA__'));
  
  const res = await p.evaluate(async () => {
    try {
        const r = await fetch('https://www.swiggy.com/api/instamart/search?query=milk');
        return await r.json();
    } catch(e) { return e.message; }
  });
  
  console.log('Swiggy API Fetch from Browser:', res ? Object.keys(res) : 'Null');
  
  await b.close();
})();
