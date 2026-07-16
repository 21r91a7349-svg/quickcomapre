const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({ headless: false }); // headful to let me see what's happening
  const c = await b.newContext();
  const p = await c.newPage();
  
  p.on('response', r => {
    const url = r.url();
    if(url.includes('.zepto.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png')) {
      console.log('API:', url);
    }
  });
  
  console.log('Navigating...');
  await p.goto('https://www.zeptonow.com/', { waitUntil: 'networkidle' });
  
  // They probably need a location to be set!
  // Zepto UI has a "Select Location" button at the top usually.
  console.log('Typing milk...');
  // Pressing '/' or 's' sometimes focuses search
  await p.keyboard.press('/');
  await p.waitForTimeout(1000);
  await p.keyboard.type('milk');
  await p.keyboard.press('Enter');
  
  await p.waitForTimeout(5000);
  console.log('Done');
  await b.close();
})();
