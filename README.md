# Preplate 🍽️

> **Production-Oriented, Multi-Tenant B2B SaaS Platform for Restaurant Pre-Arrival Ordering, Kitchen Coordination, and WhatsApp-Assisted Communication.**

[![Tests](https://img.shields.io/badge/Tests-81%20Passed-brightgreen)](https://github.com/abhi281500/Preplate)
[![Node](https://img.shields.io/badge/Node-v22.19.0-blue)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🌟 The Business Purpose

Dine-in customers at highway restaurants, busy cafes, and commercial dining hubs lose an average of **25–40 minutes** waiting for food after arrival. Preplate solves this by providing independent restaurants with their own branded pre-arrival ordering portal:

1. **Customers order before arrival:** Guests select items, specify their expected arrival time (ETA), and receive a verified reference code with a prefilled WhatsApp link.
2. **Kitchens prepare on time:** Kitchen staff receive orders with a customizable preparation buffer (e.g. 20 minutes) and accept tickets with accurate duration estimates.
3. **Food is ready on arrival:** Meals are served hot and fresh when guests walk in, eliminating table wait times without predatory third-party aggregator commissions.

---

## 🏗️ Architecture & Technical Core

Preplate is built as a **clean, modular TypeScript monolith** designed for high auditability and zero cross-tenant leakage:

- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons + Axios API client.
- **Backend:** Node.js + Express + TypeScript + Zod schema validation + Helmet + Rate Limiting.
- **Database:** MongoDB with strict compound tenant indexing (`tenantId` + `_id` / `slug`).
- **Security & Multi-Tenancy:** Tenant context is pinned directly from cryptographically signed JWT tokens. In-flight header spoofing (`x-tenant-id`) is proactively detected and rejected (`403 Forbidden`).
- **Zero Client Trust:** Pricing calculations (5% GST, line subtotals, grand totals) are strictly performed on the backend. Item names and prices are frozen as immutable snapshots on order creation.

```
c:\Restaurant\
├── client/                     # Single-Page Web Application
│   ├── src/
│   │   ├── features/
│   │   │   ├── landing/        # Preplate SaaS Landing Page
│   │   │   ├── auth/           # Login & Restaurant Self-Onboarding
│   │   │   ├── public-ordering/# Customer Storefront, Cart & Live Tracking
│   │   │   ├── restaurant/     # Owner Dashboard, Queue, Stock 86ing, Settings
│   │   │   ├── kitchen/        # Touch-Friendly Kitchen Display System (KDS)
│   │   │   └── super-admin/    # Global Multi-Tenant SaaS Control Plane
│   │   └── shared/             # API client, Auth Context, Types
├── server/                     # Express + TypeScript Modular Monolith
│   ├── src/
│   │   ├── config/             # Typed Environment Config (Zod) & Mongoose DB
│   │   ├── middleware/         # requireAuth, requireRole, enforceTenantContext, rateLimiter
│   │   ├── models/             # Tenant-scoped Mongoose models
│   │   ├── modules/
│   │   │   ├── auth/           # JWT authentication & restaurant self-onboarding
│   │   │   ├── public/         # Public restaurant directory & menu queries
│   │   │   ├── order/          # Order placement, price snapshots, tracking
│   │   │   ├── restaurant/     # Menu management, 86ing, operations, KDS, analytics
│   │   │   ├── notification/   # WhatsApp deep links, Cloud API adapter, webhooks
│   │   │   └── super/          # Multi-tenant moderation, GMV analytics, plan editor
│   │   ├── services/           # Unified notification dispatch & link builder
│   │   ├── scripts/            # Database seed script
│   │   └── tests/              # 8 Vitest integration suites (81 tests)
├── docs/                       # Engineering & Operational Specifications
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY.md
│   ├── WHATSAPP_INTEGRATION.md
│   ├── TESTING.md
│   └── PILOT_RUNBOOK.md        # Pilot execution & Kitchen Staff SOP
```

---

## 🧪 Comprehensive Automated Test Matrix

All **81 automated test cases** run against an isolated in-memory MongoDB server:

| Test Suite | File | Tests | Key Validations Covered |
|---|---|:---:|---|
| **1. Auth & Isolation** | `authAndTenantIsolation.test.ts` | 9 | JWT issuance, password hashing, RBAC enforcement, self-onboarding |
| **2. Tenant Scoping** | `tenantEnforcement.test.ts` | 5 | Cross-tenant spoofing rejection, suspended account blocking |
| **3. Menu & Profile** | `menuAndProfile.test.ts` | 15 | Category CRUD, item CRUD, instant 86ing, operating hours |
| **4. Order Engine** | `orderEngine.test.ts` | 9 | Server pricing, 5% GST, arrival buffers, immutable snapshots |
| **5. Operations & KDS** | `restaurantOperations.test.ts` | 9 | Queue badges, prep estimation, KDS status lifecycle, metrics |
| **6. WhatsApp & Alerts** | `whatsappNotification.test.ts` | 10 | Deep-link generation, audit logging, Meta webhook verification |
| **7. Super Admin SaaS** | `superAdminManagement.test.ts` | 12 | Platform GMV, tenant moderation, plan pricing in INR, audit log |
| **8. E2E Lifecycle** | `endToEndLifecycle.test.ts` | 12 | Full journey: Admin → Onboard → Menu → Order → Cook → Serve → Report |
| **Total** | **8 Test Suites** | **81** | **100% Passed** |

---

## 🔑 Demo Seed Accounts

Use these pre-seeded accounts to explore the platform:

| Role | Email | Password | Tenant / Portal |
|---|---|---|---|
| **Platform Super Admin** | `superadmin@preplate.io` | `Admin@Preplate2026!` | Global SaaS Control Plane (`/admin/super`) |
| **Restaurant Owner (Dhaba)** | `owner@highwaydhaba.com` | `DhabaOwner@123` | Highway Dhaba Express (`/admin/restaurant`) |
| **Kitchen Staff (Dhaba)** | `kitchen@highwaydhaba.com` | `KitchenStaff@123` | Dhaba KDS View (`/admin/restaurant`) |
| **Restaurant Owner (Cafe)** | `owner@urbanspice.com` | `UrbanOwner@123` | Urban Spice Cafe (`/admin/restaurant`) |
| **Guest Customer** | *No account required* | *Zero login barrier* | Public Storefront (`/r/highway-dhaba`) |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v18+ (Tested on v22.19.0)
- **MongoDB:** MongoDB Atlas or local MongoDB daemon.

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 4. Seed the Database
Populates Super Admin, subscription tiers (Starter ₹499/mo, Pro ₹999/mo), and pilot demo restaurants:
```bash
cd server
npm run seed
```

### 5. Run the Automated Test Suite
```bash
cd server
npm test
```

### 6. Start Development Servers
```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (port 5173)
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🛡️ Production & Security Hardening Features

- **Rate Limiting:** Sliding-window rate limiters protect authentication (`/api/v1/auth/*`) and public order placement (`/api/v1/public/restaurants/:slug/orders`) against brute force and automated spam.
- **Graceful Shutdown:** Handles `SIGINT` and `SIGTERM` signals, closes active HTTP listeners, and safely disconnects Mongoose connections.
- **Strict Tenant Context Middleware:** Pinned `req.tenantId` is immutable and cannot be overwritten by client-supplied query params or spoofed headers.
- **Instant Stock 86ing:** One-click out-of-stock toggle immediately rejects checkout attempts with an informative customer warning.
- **Configurable Subscription Plans:** SaaS pricing and features are controlled dynamically via the Super Admin portal, eliminating hardcoded prices.

---

## 📄 License
This project is licensed under the MIT License.
