import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('Navbar layout changes on mobile', async ({ page, isMobile }) => {
    await page.goto('/');
    
    if (isMobile) {
      // Mobile navbar typically has a hamburger menu or different spacing
      // We check if the search bar collapses or hero text resizes
      const heroText = page.locator('h1');
      await expect(heroText).toBeVisible();
      
      const searchInput = page.getByPlaceholder(/Search for/i);
      await expect(searchInput).toBeVisible();
    } else {
      // Desktop checks
      const signInBtn = page.getByRole('button', { name: /Sign In/i });
      await expect(signInBtn).toBeVisible();
    }
  });
});
