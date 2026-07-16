# API Documentation

The QuickCompare internal API is located under `/api/`. All endpoints return JSON responses.

---

## 1. Search API

Endpoint to initiate parallel scraping and heuristic matching.

**Request:**
`GET /api/search?q={query}`

**Query Parameters:**
- `q` (string, required): The product search term.

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "cmr...",
      "display_name": "Amul Taaza Milk",
      "canonical_image_url": "https://...",
      "listings": [
        {
          "platform": "blinkit",
          "currentPrice": 28,
          "inStock": true,
          "url": "https://blinkit.com/..."
        }
      ]
    }
  ]
}
```

**Errors:**
- `400 Bad Request`: `{ "error": "Query parameter 'q' is required" }`
- `429 Too Many Requests`: Triggered if rate limit (20 req/min/IP) is exceeded.
- `500 Internal Server Error`

---

## 2. Price History API

Retrieves the historical price snapshots for a specific product ID.

**Request:**
`GET /api/products/[id]/history`

**Response (200 OK):**
```json
{
  "history": [
    {
      "platform": "zepto",
      "price": 27,
      "inStock": true,
      "timestamp": "2026-07-16T08:00:00Z"
    }
  ]
}
```

---

## 3. Alerts API

Manages user price subscriptions.

### Create Alert
**Request:**
`POST /api/alerts`

**Body:**
```json
{
  "productId": "string",
  "targetPrice": 50,
  "condition": "BELOW",
  "contactMethod": "EMAIL",
  "contactAddress": "user@example.com"
}
```
*Note: If the user is authenticated, the API forces `contactAddress` to the secure session email.*

**Response (200 OK):**
```json
{
  "success": true,
  "alert": {
    "id": "c...",
    "productId": "..."
  }
}
```

### Fetch Alerts
**Request:**
`GET /api/alerts?contactAddress={email}`
*(Anonymous users require the `contactAddress` parameter. Authenticated users will inherently use their session.)*

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "c...",
      "targetPrice": 50,
      "product": { ... }
    }
  ]
}
```

---

## 4. Health Check API

**Request:**
`GET /api/health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-16T10:00:00.000Z",
  "database": "connected"
}
```
