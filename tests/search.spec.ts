import { test, expect } from '@playwright/test';

test.describe('Search Flows', () => {
  test('Homepage has search input and works', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByPlaceholder(/Search for milk, bread.../i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Amul Milk');
    await searchInput.press('Enter');

    // Should navigate to /search?q=Amul+Milk
    await expect(page).toHaveURL(/\/search\?q=Amul\+Milk/);
    await expect(page.getByRole('heading', { name: /Search Results for "Amul Milk"/i })).toBeVisible();
  });

  test('Empty search displays empty state', async ({ page }) => {
    await page.goto('/search?q=somethingthatdoesnotexist12345');
    
    // Check for empty state icon/text
    await expect(page.getByText(/No exact matches found/i)).toBeVisible();
    await expect(page.getByText(/We couldn't find any products matching/i)).toBeVisible();
  });

  test('Invalid query behaves safely', async ({ page }) => {
    await page.goto('/search'); // no q param
    
    // Should gracefully show empty results or default state
    await expect(page.locator('form').first()).toBeVisible();
  });
});
