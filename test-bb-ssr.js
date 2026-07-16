const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  
  await p.goto('https://www.bigbasket.com/bbnow/search/?q=milk', {waitUntil: 'domcontentloaded'});
  const html = await p.evaluate(() => document.documentElement.innerHTML);
  
  console.log('Amul found?', html.includes('Amul'));
  
  let stateStr = '';
  if (html.includes('window.__INITIAL_STATE__')) {
    stateStr = 'window.__INITIAL_STATE__';
  } else if (html.includes('__NEXT_DATA__')) {
    stateStr = '__NEXT_DATA__';
  } else if (html.includes('window.__PRELOADED_STATE__')) {
    stateStr = 'window.__PRELOADED_STATE__';
  }
  
  console.log('State method:', stateStr || 'None');
  await b.close();
})();
