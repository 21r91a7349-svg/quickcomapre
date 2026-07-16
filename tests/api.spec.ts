import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('GET /api/health should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('GET /api/search should require q parameter', async ({ request }) => {
    const response = await request.get('/api/search');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Query parameter "q" is required');
  });

  test('GET /api/search should return results for valid query', async ({ request }) => {
    const response = await request.get('/api/search?q=milk');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.results)).toBeTruthy();
  });
});
