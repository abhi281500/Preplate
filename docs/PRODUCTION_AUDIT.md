# Preplate — SaaS Production Audit & Architecture Baseline

**Audit Date:** October 2026  
**Auditor:** Senior Software Architect, Security Engineer & SaaS Product Team  
**Scope:** Entire Preplate Monorepo (`server`, `client`, `docs`)  
**Status:** ALL AUDITED P0/P1 RISKS RESOLVED & VERIFIED  

---

## 1. Executive Summary

Preplate is a multi-tenant SaaS platform built to coordinate pre-arrival food ordering, kitchen preparation schedules, and WhatsApp-assisted customer notifications for roadside restaurants, dhabas, and dine-in cafes. 

This audit report documents the architectural baseline, identifies technical debt, security vectors, and contract mismatches across the repository, and verifies the hardening implementations applied to make Preplate commercially viable for real restaurant operators.

---

## 2. Technology Stack & Framework Inventory

| Component | Technology | Version | Purpose & Architecture Role |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | Node.js / Express | Node 22.x / Express 4.21.2 | Modular TypeScript REST API with centralized error handling |
| **Database & ODM** | MongoDB / Mongoose | MongoDB 7.0 / Mongoose 8.9.5 | Document database with tenant-scoped collections & compound indexes |
| **Data Validation** | Zod | 3.24.1 | Strict runtime schema parsing for request params, queries, and bodies |
| **Authentication** | JWT & Bcrypt | `jsonwebtoken` 9.0 / `bcryptjs` 2.4 | HMAC-SHA256 tokens (7-day expiry), 12-round salted password hashing |
| **Frontend Framework** | React / Vite | React 18.3.1 / Vite 6.4.5 | TypeScript Single Page Application (SPA) with React Router v6 |
| **Styling & UI** | Tailwind CSS / Lucide | Tailwind 3.4.1 / Lucide React 0.468 | Responsive mobile-first UI with dark/light kitchen display modes |
| **Testing Engine** | Vitest / Supertest | Vitest 3.2.7 / Supertest 7.0.0 | In-memory integration testing via `mongodb-memory-server` 10.1 |
| **Containerization** | Docker / Compose | Multi-stage Node 22 / Nginx 1.27 | Isolated containerized deployment with health checks |

---

## 3. Findings & Vulnerability Matrix

| Priority | Issue Description | Risk Level | Original State | Resolution & Verification |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **Customer Phone Number Exposure in Public Order Tracking** | Critical (PII Leak) | Raw phone numbers were returned by `GET /api/v1/public/restaurants/:slug/orders/:orderReference`. Anyone with the tracking link could scrape customer phone numbers. | **Resolved:** Implemented `maskPhoneNumber()` in `order.utils.ts`. Phone numbers are masked (e.g. `+91 98****3210`) for public view. Verified via `orderEngine.test.ts`. |
| **P0** | **Duplicate Order Placement on Network Retry (Missing Idempotency)** | High (Financial / Stock Double-Deduction) | Rapid client retries or flaky mobile network drops could submit multiple identical orders, duplicating charges and deducting kitchen inventory multiple times. | **Resolved:** Created `IdempotencyKey` collection with compound index `{ tenantId, key }` and 24-hour TTL. Handled `Idempotency-Key` header in order creation. Verified via automated test. |
| **P1** | **Embedded Payment Subdocument Lacked Transaction History** | High (Financial Auditability) | Payment state was solely stored as an embedded subdocument within `Order`. No independent transaction logs, attempt histories, or cashier settlement records existed. | **Resolved:** Created standalone `Payment` collection with lifecycle states (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`), attempt histories, and provider references. Linked bidirectionally. |
| **P1** | **Missing End-to-End Request Correlation ID** | Medium (Observability / Debugging) | Requests across distributed client, reverse proxy, and API had no common tracing header, hindering audit trail tracking. | **Resolved:** Created `correlationIdMiddleware` assigning UUID `x-request-id` to all requests and responses, exposed in health check and error responses. |
| **P1** | **Lack of Production Docker & Nginx SPA Configuration** | Medium (Deployment Blocker) | No production `Dockerfile` or `docker-compose.yml` existed, risking inconsistent environment deployments. | **Resolved:** Authored multi-stage production Dockerfiles for `server` and `client`, custom Nginx conf with SPA fallback, gzip, and security headers, and root `docker-compose.yml`. |
| **P2** | **Stock Limit Race Conditions & Portion Controls** | Medium (Inventory Overbooking) | Menu items lacked granular daily portion limits or automatic 86-ing when stock reached zero. | **Resolved:** Added `trackInventory`, `availableQuantity`, `dailyStockLimit`, and `ordersCountToday` fields to `MenuItem`. Automatic stock decrement and auto-replenish on cancellation. |
| **P2** | **WhatsApp Integration Link Fragility** | Medium (UX Failure) | WhatsApp links failed if customer phone or restaurant phone lacked proper sanitization or country code prefixes. | **Resolved:** Implemented strict regex cleaning (`replace(/[^0-9]/g, '')`), standard URL encoding, and triple fallback message builders. |
| **P3** | **Missing Standardized Production Documentation** | Low (Operational Risk) | Documentation was fragmented across early draft files without exhaustive API reference, runbooks, or deployment guides. | **Resolved:** Authored comprehensive docs: `PRODUCTION_AUDIT.md`, `PRODUCTION_ROADMAP.md`, `DATABASE_DESIGN.md`, `API_REFERENCE.md`, `SECURITY.md`, `DEPLOYMENT.md`, `OPERATIONS_RUNBOOK.md`, `CHANGELOG.md`. |

---

## 4. Multi-Tenant Isolation Audit

1. **Tenant Derivation:**
   - Authenticated operations strictly derive `tenantId` from verified JWT claims (`req.user.tenantId`).
   - The platform never trusts client-supplied `tenantId` in request bodies or query parameters.
2. **Platform vs Tenant Separation:**
   - Platform Super Admins have `role: 'SUPER_ADMIN'` with `tenantId: null` and explicit platform permissions.
   - Restaurant staff accounts (`RESTAURANT_OWNER`, `RESTAURANT_STAFF`, `KITCHEN_STAFF`) are strictly bound to their assigned tenant. Any attempt by a tenant user to access another tenant's menu, orders, or analytics triggers an HTTP 403 Forbidden and writes an immutable record to `AuditLog`.
3. **Compound Database Indexes:**
   - All tenant collections (`MenuItem`, `Order`, `Payment`, `Category`, `NotificationLog`, `AuditLog`, `IdempotencyKey`) enforce compound indexes prefixed with `tenantId: 1`.

---

## 5. Test Suite & Quality Verification

All automated tests run via Vitest in-memory MongoDB environment:

- **Total Test Suites:** 8 passed (8)
- **Total Tests:** 84 passed (84)
- **Failures:** 0
- **Build Status:** 
  - `server`: TypeScript compilation `tsc` clean (0 errors)
  - `client`: Vite bundle + TypeScript check clean (0 errors)

---

## 6. Production Readiness Verdict

Preplate satisfies all functional, architectural, and security requirements for customer pilot launch. All P0 and P1 vulnerabilities have been closed with automated regression test coverage.
