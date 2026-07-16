import { test, expect } from '@playwright/test';

test.describe('Product Details & Alerts', () => {
  // We mock a search and click the first result, or navigate directly to a known ID.
  // Since DB is dynamic, we'll navigate to search and click the first product.
  test('Product page renders charts and comparison cards', async ({ page }) => {
    await page.goto('/search?q=milk');
    
    // Wait for results
    const productCard = page.locator('a[href^="/product/"]').first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    
    // Click and navigate
    await productCard.click();
    
    // Check product page elements
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Price History/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Notify Me/i })).toBeVisible();
  });

  test('Notify Me modal opens and validates', async ({ page }) => {
    await page.goto('/search?q=milk');
    const productCard = page.locator('a[href^="/product/"]').first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    await productCard.click();
    
    const notifyBtn = page.getByRole('button', { name: /Notify Me/i });
    await notifyBtn.click();
    
    const modalHeading = page.getByRole('heading', { name: /Create Price Alert/i });
    await expect(modalHeading).toBeVisible();
    
    // Try to submit empty
    const saveBtn = page.getByRole('button', { name: /Save Alert/i });
    await saveBtn.click();
    
    // Should show validation error (HTML5 required attribute validation or custom toast)
    // For now we check if modal is still open indicating failure to submit
    await expect(modalHeading).toBeVisible();
  });
});
