const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  
  await p.goto('https://www.bigbasket.com/', {waitUntil: 'domcontentloaded'});
  const res = await p.evaluate(async () => {
    try {
        const r = await fetch('/custompage/getsearchdata/?slug=milk&type=deck');
        return await r.json();
    } catch(e) { return e.message; }
  });
  
  console.log(res ? Object.keys(res) : 'Null');
  if(res && res.json_data) console.log('Products:', res.json_data.tab_info[0].product_info.products.length);
  await b.close();
})();
