# Zepto Adapter Recovery Report — Sprint 6

## Endpoint
- **URL**: `https://api.zeptonow.com/api/v3/search?q={query}`
- **Method**: GET (via Playwright browser context `page.request.fetch`)

## Required Headers
| Header | Value | Notes |
|--------|-------|-------|
| `Origin` | `https://www.zeptonow.com` | Required for CORS |
| `Referer` | `https://www.zeptonow.com/` | Required for CORS |
| `Accept` | `application/json` | — |
| `app_version` | `12.25.0` | Zepto web app version |
| `app_sub_version` | `12.25.0` | Same as app_version |
| `platform` | `WEB` | Platform identifier |
| `tenant` | `ZEPTO` | Tenant identifier |
| `User-Agent` | Standard Chrome UA | — |

## Cookies
- No specific cookies required for search API.
- Session cookies may be set by WAF (Cloudflare) on first request.

## Response Format

### Expected Layout Structure
```json
{
  "layout": [
    {
      "widgetId": "SEARCH_RESULTS",
      "data": {
        "items": [
          {
            "product": {
              "id": "string",
              "name": "string",
              "brand": "string | null",
              "sellingPrice": "number",
              "mrp": "number",
              "discountPercent": "number | null",
              "outOfStock": "boolean",
              "imageResponse": {
                "image": { "url": "string" }
              },
              "category": { "name": "string" }
            }
          }
        ]
      }
    }
  ]
}
```

### Alternative Structures (handled by parser)
- `data.storeProductsResponse.products[]`
- `data.data.products[]`

## Anti-Bot Behavior
- **WAF**: Cloudflare (observed on `zeptonow.com`)
- **Block Triggers**: Rapid sequential requests, missing headers, datacenter IPs.
- **Block Response**: HTTP 403 with HTML challenge page (not JSON).
- **Mitigation**: Playwright stealth plugin, browser context with proper headers, rate limiting via `RequestManager`.

## Parser Assumptions
1. Products are found under `layout[].data.items[].product` where `widgetId === 'SEARCH_RESULTS'` or items array is non-empty.
2. Required fields: `product.id`, `product.name`, `product.sellingPrice` or `product.mrp`.
3. Image URL prefix: `https://cdn.zeptonow.com/`.

## Known Limitations
- **Geo-restriction**: Zepto API may return different product catalogs based on IP geolocation. Server-side scraping from non-Indian IPs may return empty results or blocked responses.
- **Rate Limiting**: Aggressive rate limits observed (>5 req/min triggers temporary blocks).
- **API Versioning**: `v3` endpoint may change without notice.

## Error Classification
| HTTP Status | Classified As | Notes |
|-------------|---------------|-------|
| 200 + products | `SUCCESS` | — |
| 200 + 0 products | `ZERO_RESULTS` | Valid response, no matching products |
| 200 + unexpected JSON | `PARSER_FAILED` | Layout structure changed |
| 401, 403 | `BLOCKED_BY_ANTI_BOT` | WAF or auth challenge |
| 5xx | `NETWORK_FAILED` | Server error |
| Timeout | `TIMEOUT` | Per-adapter timeout exceeded |

## Debug Mode
Set `DEBUG_ADAPTERS=true` to save raw API responses to `logs/zepto-raw-{timestamp}.json` (disabled in production).
