import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Navbar shows Sign In when unauthenticated', async ({ page }) => {
    await page.goto('/');
    
    const signInBtn = page.getByRole('button', { name: /Sign In/i });
    await expect(signInBtn).toBeVisible();
  });

  // Note: True OAuth flow testing requires mocking NextAuth in E2E.
  // We verify that clicking Sign In opens the dropdown or redirects to providers.
  test('Clicking Sign In triggers Auth flow', async ({ page }) => {
    await page.goto('/');
    
    const signInBtn = page.getByRole('button', { name: /Sign In/i });
    await signInBtn.click();
    
    // Auth.js default behavior is either a popup or a redirect to /api/auth/signin
    // We just verify the button is interactive and doesn't crash the page.
    await expect(page).toHaveURL(/.*api\/auth\/signin.*/);
  });
});
