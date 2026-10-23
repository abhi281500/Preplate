# Preplate 🍽️

> **Multi-tenant B2B SaaS platform for restaurant pre-arrival food ordering, preparation-time coordination, and WhatsApp-assisted communication.**

Preplate empowers dine-in restaurants, highway eateries, corporate cafes, and campus food hubs to coordinate food preparation with customer arrival times—reducing idle wait times without predatory delivery aggregator commissions.

---

## 🌟 Key Features

* **Multi-Tenant Architecture:** Complete data isolation by `tenantId` across all databases, queries, and APIs.
* **Role-Based Access Control (RBAC):** Distinct permissions for `SUPER_ADMIN`, `RESTAURANT_OWNER`, and `RESTAURANT_STAFF`.
* **Guest Ordering Portal:** Mobile-first, lightweight web application (`/r/:restaurantSlug`) requiring zero mandatory sign-up.
* **ETA & Prep Coordination:** Validated arrival times, minimum kitchen buffer, and real-time state machine (`PENDING_CONFIRMATION` → `ACCEPTED` → `PREPARING` → `READY` → `SERVED`).
* **WhatsApp Assistance:** One-tap contextual order notification links (`wa.me`) with full item summaries.
* **Touch-Friendly KDS & Instant 86ing:** Kitchen Display System for quick ticket advancement and immediate out-of-stock toggles.
* **Configurable SaaS Subscription Plans:** Database-driven plans (`STARTER`, `PRO`, `ENTERPRISE`) with INR pricing and feature caps.

---

## 🏗️ Repository Architecture

Preplate is architected as a clean modular monolith:

```
c:\Restaurant\
├── client/                     # React 18 + Vite + Tailwind CSS Single-Page Application
│   ├── src/
│   │   ├── features/
│   │   │   ├── landing/        # SaaS Marketing & Demo Showcase
│   │   │   ├── auth/           # Login & Restaurant Self-Onboarding
│   │   │   ├── public-ordering/# Customer Menu & Cart
│   │   │   ├── restaurant/     # Owner Dashboard & Kitchen View
│   │   │   └── super-admin/    # SaaS Platform Administrator Portal
│   │   └── shared/             # API client (Axios) & AuthContext
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Typed Environment (Zod) & Mongoose DB connection
│   │   ├── models/             # Mongoose schemas with tenant isolation indexing
│   │   ├── middleware/         # enforceTenantContext, requireAuth, validateRequest, errorHandler
│   │   ├── modules/            # Domain modules (auth, menu, orders, analytics, super-admin)
│   │   ├── scripts/            # Seed utility (Demo restaurants & super admin)
│   │   └── tests/              # Vitest + Supertest integration & tenant isolation test suite
├── docs/                       # Complete architectural and operational specifications
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY.md
│   ├── WHATSAPP_INTEGRATION.md
│   └── TESTING.md
├── .env.example                # Safe environment variable template
└── package.json                # Root npm workspace orchestrator
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js:** v18+ (Tested on v22.19.0)
- **MongoDB:** MongoDB Atlas or local MongoDB daemon. (Automated tests use an in-memory database and run zero-dependency).

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Seed the Database
Seeds the Super Admin account, subscription plans, and two pilot demo restaurants (*Highway Dhaba Express* and *Urban Spice Cafe*):
```bash
cd server
npm run seed
```

### 5. Run Automated Tests
```bash
cd server
npm test
```

### 6. Start Development Servers
```bash
# Run server (port 5000)
cd server
npm run dev

# In a separate terminal, run client (port 5173)
cd client
npm run dev
```

---

## 🔑 Demo Seed Accounts

| Role | Email | Password | Scope / Slug |
|---|---|---|---|
| **Platform Super Admin** | `superadmin@preplate.io` | `Admin@Preplate2026!` | SaaS-wide control plane |
| **Restaurant Owner (Highway Dhaba)** | `owner@highwaydhaba.com` | `DhabaOwner@123` | `/r/highway-dhaba` |
| **Kitchen Staff (Highway Dhaba)** | `kitchen@highwaydhaba.com` | `KitchenStaff@123` | Kitchen Display View |
| **Restaurant Owner (Urban Spice)** | `owner@urbanspice.com` | `UrbanOwner@123` | `/r/urban-spice` |

---

## 🛡️ Security & Multi-Tenancy Guarantee
- Tenant identity (`tenantId`) is always extracted from the verified cryptographic JWT bearer token—never from user-controlled URLs or request payloads.
- Automated cross-tenant tests verify that Restaurant A cannot read, modify, or spoof Restaurant B's data under any condition.
- Client-calculated totals are never accepted; the backend is the sole source of truth for menu pricing, availability, and arrival buffers.
