import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Smoke Tests', () => {
  test('Homepage should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Search page should not have accessibility issues', async ({ page }) => {
    await page.goto('/search?q=milk');
    
    // Wait for loading to finish
    await page.waitForSelector('text=Found', { state: 'visible', timeout: 10000 }).catch(() => {});
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
