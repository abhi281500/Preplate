# Preplate — REST API Specification & Reference Catalog

**API Base URL:** `/api/v1`  
**Content-Type:** `application/json`  
**Authentication Scheme:** `Bearer <JWT_TOKEN>`  

---

## 1. Global Request & Response Standards

### Standard Headers
| Header Name | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `Authorization` | JWT Bearer token for protected routes | Protected routes only | `Bearer eyJhbGci...` |
| `Idempotency-Key` | Client-generated UUID preventing duplicate mutations | Optional (Recommended for Orders) | `8f219f8a-4c22-48a5-b103-9df6d795b597` |
| `x-request-id` | Tracing UUID propagated across proxy, server, and logs | Handled automatically by server | `d2847fb3-5492-4f98-b80c-6a165b45ea44` |

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human-readable explanation of error or validation failure",
  "errors": [
    {
      "field": "customer.phone",
      "message": "Phone number must be at least 10 digits"
    }
  ]
}
```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### 2.1. User Login
`POST /api/v1/auth/login`
- **Access:** Public (Rate limited: 10 requests / 15 mins)
- **Request Body:**
```json
{
  "email": "owner@highwaydhaba.com",
  "password": "DhabaOwner@123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "6718...",
      "name": "Harpreet Singh",
      "email": "owner@highwaydhaba.com",
      "role": "RESTAURANT_OWNER",
      "tenantId": "tenant_highway_dhaba_001"
    },
    "restaurant": {
      "name": "Highway Dhaba Express",
      "slug": "highway-dhaba"
    }
  }
}
```

### 2.2. Current Session Profile
`GET /api/v1/auth/me`
- **Access:** Authenticated Staff / Owner / Admin

---

## 3. Public Customer Storefront & Ordering (`/api/v1/public`)

### 3.1. Get Restaurant Public Profile & Menu
`GET /api/v1/public/restaurants/:slug/menu`
- **Access:** Public
- **Query Params:**
  - `foodType`: `VEG` | `NON_VEG` | `VEGAN` (Optional)
  - `search`: String query matching item name or description (Optional)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "name": "Highway Dhaba Express",
      "slug": "highway-dhaba",
      "tagline": "Authentic Punjabi taste on the expressway",
      "contactPhone": "+919876543210",
      "orderBufferMinutes": 20,
      "minimumOrderAmount": 100
    },
    "categories": [
      {
        "id": "671a...",
        "name": "Breads & Naans",
        "items": [
          {
            "id": "671b...",
            "name": "Butter Naan",
            "price": 45,
            "foodType": "VEG",
            "isAvailable": true,
            "trackInventory": true,
            "availableQuantity": 50
          }
        ]
      }
    ]
  }
}
```

### 3.2. Submit Pre-Arrival Order Request
`POST /api/v1/public/restaurants/:slug/orders`
- **Access:** Public
- **Headers:** `Idempotency-Key` (Optional)
- **Request Body:**
```json
{
  "customer": {
    "name": "Vikram Batra",
    "phone": "+919876543210",
    "specialInstructions": "Extra butter on dal"
  },
  "items": [
    { "menuItemId": "671b...", "quantity": 2 }
  ],
  "expectedArrivalTime": "2026-10-27T14:30:00.000Z",
  "paymentMethod": "PAY_AT_RESTAURANT"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Order request successfully placed and awaiting restaurant confirmation.",
  "data": {
    "orderReference": "ORD-20261026-AB12",
    "status": "PENDING_CONFIRMATION",
    "expectedArrivalTime": "2026-10-27T14:30:00.000Z",
    "pricing": {
      "subtotal": 310,
      "taxAmount": 16,
      "totalAmount": 326
    },
    "whatsAppLink": "https://wa.me/919876543210?text=...",
    "trackingUrl": "/r/highway-dhaba/order/ORD-20261026-AB12"
  }
}
```

### 3.3. Track Live Order Status (With PII Masking)
`GET /api/v1/public/restaurants/:slug/orders/:orderReference`
- **Access:** Public
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderReference": "ORD-20261026-AB12",
    "status": "ACCEPTED",
    "customer": {
      "name": "Vikram Batra",
      "phone": "+91 98****3210"
    },
    "items": [...],
    "pricing": {
      "subtotal": 310,
      "taxAmount": 16,
      "totalAmount": 326
    },
    "scheduling": {
      "expectedArrivalTime": "2026-10-27T14:30:00.000Z",
      "estimatedReadyTime": "2026-10-27T14:25:00.000Z"
    }
  }
}
```

### 3.4. Cancel Order (Pre-Acceptance Only)
`POST /api/v1/public/restaurants/:slug/orders/:orderReference/cancel`
- **Access:** Public (Only permitted while status is `PENDING_CONFIRMATION`)

---

## 4. Restaurant Operations & Kitchen Display System (`/api/v1/restaurant`)

### 4.1. Get Restaurant Order Queue
`GET /api/v1/restaurant/orders`
- **Access:** Authenticated Restaurant Staff / Owner
- **Query Params:** `statusFilter`: `PENDING` | `ACTIVE` | `HISTORY` | `ALL`
- **Response (200 OK):** Returns orders array and `queueSummary` counts (`pendingCount`, `acceptedCount`, `preparingCount`, `readyCount`, `totalActive`).

### 4.2. Accept Incoming Order
`POST /api/v1/restaurant/orders/:id/accept`
- **Access:** Staff / Kitchen Staff / Owner
- **Request Body:**
```json
{
  "prepDurationMinutes": 25
}
```

### 4.3. Reject Incoming Order
`POST /api/v1/restaurant/orders/:id/reject`
- **Request Body:**
```json
{
  "reason": "Kitchen ran out of fresh tandoori dough"
}
```

### 4.4. Advance Order Status (KDS)
`PATCH /api/v1/restaurant/orders/:id/status`
- **Request Body:**
```json
{
  "nextStatus": "PREPARING"
}
```
*Permitted progressive transitions:*
- `ACCEPTED` -> `PREPARING`
- `PREPARING` -> `READY`
- `READY` -> `SERVED` (Automatically updates payment to `PAID` / `COMPLETED`)

---

## 5. Restaurant Menu & Inventory Management (`/api/v1/restaurant/menu`)

### 5.1. List Restaurant Categories & Items
`GET /api/v1/restaurant/menu`

### 5.2. Create Menu Item with Portion Controls
`POST /api/v1/restaurant/menu/items`
- **Request Body:**
```json
{
  "categoryId": "671a...",
  "name": "Dal Makhani",
  "description": "Slow cooked black lentils with white butter",
  "price": 220,
  "foodType": "VEG",
  "isAvailable": true,
  "trackInventory": true,
  "dailyStockLimit": 40,
  "availableQuantity": 40
}
```

### 5.3. Update Portion Count or Toggle Stock
`PATCH /api/v1/restaurant/menu/items/:id/stock`
- **Request Body:**
```json
{
  "availableQuantity": 15,
  "isAvailable": true
}
```

---

## 6. Super Admin SaaS Management (`/api/v1/super`)

### 6.1. Platform Overview & Metrics
`GET /api/v1/super/overview`
- **Access:** `SUPER_ADMIN` only
- **Response (200 OK):** Platform GMV, total restaurants, active tenants, order counts by status.

### 6.2. Onboard / Register New Restaurant
`POST /api/v1/super/restaurants`
- **Access:** `SUPER_ADMIN` only

### 6.3. Manage Restaurant Status
`PATCH /api/v1/super/restaurants/:id/status`
- **Request Body:** `{ "status": "ACTIVE" | "SUSPENDED" }`

### 6.4. Subscription Plans Management
- `GET /api/v1/super/plans`
- `POST /api/v1/super/plans`
