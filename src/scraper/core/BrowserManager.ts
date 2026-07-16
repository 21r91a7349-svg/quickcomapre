import { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import { scraperConfig } from '../config';
import { ScraperLogger } from './logger';
import { SessionManager } from './SessionManager';
import { ProxyManager } from './ProxyManager';

export class BrowserManager {
  private browser: Browser | null = null;
  private logger = new ScraperLogger('BrowserManager');
  private sessionManager = new SessionManager();
  private proxyManager = new ProxyManager();

  /**
   * Initializes the browser if it hasn't been started yet.
   * This is designed to be a singleton per scraper worker.
   */
  private async initBrowser() {
    if (!this.browser) {
      try {
        console.log('[DIAGNOSTIC] Playwright initBrowser launching');
        this.logger.info('Launching new Playwright browser instance');
        
        try {
          // Lazy-load stealth plugin (makes it optional and prevents top-level module crash)
          const stealthPlugin = require('puppeteer-extra-plugin-stealth');
          chromium.use(stealthPlugin());
          this.logger.debug('Stealth plugin loaded successfully');
        } catch (e: any) {
          this.logger.warn(`Optional stealth plugin not found: ${e.message}. Proceeding without stealth.`);
        }

        const proxy = this.proxyManager.getProxy();
        
        try {
          console.log('[DIAGNOSTIC] Chromium executablePath:', chromium.executablePath());
          console.log('[DIAGNOSTIC] Playwright version:', require('playwright/package.json').version);
        } catch (e) {}

        this.browser = await chromium.launch({
          headless: scraperConfig.browser.headless,
          args: scraperConfig.browser.args,
          proxy: proxy ? { server: proxy.server, username: proxy.username, password: proxy.password } : undefined
        });
        
        console.log('[DIAGNOSTIC] Playwright browser launch success');
      } catch (error: any) {
        console.error('[DIAGNOSTIC EXCEPTION in initBrowser]', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          file: 'src/scraper/core/BrowserManager.ts',
          line: 'chromium.launch'
        });
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * Generates realistic random viewport and headers
   */
  private getFingerprintOptions() {
    // Basic randomization to avoid identical fingerprints
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 }
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    
    return {
      viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      hasTouch: false,
      defaultBrowserType: 'chromium'
    };
  }

  /**
   * Spawns a new page context, optionally restoring a session.
   */
  async newPage(platformId: string): Promise<{ context: BrowserContext, page: Page }> {
    const browser = await this.initBrowser();
    
    this.logger.debug(`Creating new page context for ${platformId}`);
    
    const context = await browser.newContext(this.getFingerprintOptions());

    // Restore session if available
    const session = await this.sessionManager.getSession(platformId);
    if (session && session.cookies) {
      await context.addCookies(session.cookies);
      this.logger.debug(`Restored cookies for ${platformId}`);
    }

    // Advanced fingerprinting (Navigator properties)
    if (scraperConfig.browser.stealthEnabled) {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        window.chrome = { runtime: {} };
      });
    }

    const page = await context.newPage();
    
    // Set local storage if session has it
    if (session && session.localStorage) {
      await page.addInitScript((ls) => {
        for (const [key, value] of Object.entries(ls)) {
          window.localStorage.setItem(key, value as string);
        }
      }, session.localStorage);
    }

    return { context, page };
  }

  /**
   * Saves the current session state and closes the context.
   */
  async closePage(platformId: string, context: BrowserContext, page: Page) {
    try {
      this.logger.debug(`Saving session and closing page for ${platformId}`);
      
      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => {
        const ls: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) ls[key] = window.localStorage.getItem(key) || '';
        }
        return ls;
      });

      await this.sessionManager.saveSession(platformId, {
        cookies,
        localStorage,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: Date.now()
      });

    } catch (error: any) {
      this.logger.error(`Failed to save session during teardown for ${platformId}`, { error: error.message });
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Tears down the entire browser instance (used for worker shutdown)
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info('Browser instance closed');
    }
  }
}
