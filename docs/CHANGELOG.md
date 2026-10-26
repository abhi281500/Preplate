# Preplate — Platform Changelog & Release History

All notable technical changes, architectural enhancements, bug fixes, and security patches for Preplate are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

---

## [1.0.0-PROD] — October 2026

### Added
- **Multi-Tenant Foundation & Security Core (Phase 1):**
  - Tenant-isolated collections (`Restaurant`, `User`, `Category`, `MenuItem`, `Order`, `Payment`, `AuditLog`, `NotificationLog`).
  - Cryptographic authentication with `bcryptjs` (12 rounds) and HMAC-SHA256 JWT tokens.
  - Role-based authorization middleware (`SUPER_ADMIN`, `RESTAURANT_OWNER`, `RESTAURANT_STAFF`, `KITCHEN_STAFF`).
  - Cross-tenant violation detection and tamper-evident audit logging.
- **Storefront & Menu Management (Phase 2):**
  - Public menu browsing by restaurant slug with category grouping, search, and veg/non-veg filters.
  - Portion controls and inventory tracking (`trackInventory`, `availableQuantity`, `dailyStockLimit`, `ordersCountToday`).
  - Automatic item "86"-ing when portion quantities deplete to 0.
- **Ordering Engine & Server Calculations (Phase 3):**
  - Server-side price calculation and 5% GST computation.
  - Pre-arrival preparation buffer enforcement based on restaurant configuration.
  - Immutable line-item snapshotting (`nameSnapshot`, `priceSnapshot`, `subtotal`).
- **Kitchen Operations & KDS (Phase 4):**
  - Live incoming order queue with summary counts (`pendingCount`, `acceptedCount`, `preparingCount`, `readyCount`).
  - Progressive order status state machine with strict transition guards.
  - Order cancellation and rejection workflows with automatic inventory replenishment.
- **WhatsApp Integration (Phase 5):**
  - Zero-cost Click-to-Chat deep link generator with URL encoding and fallback handling.
  - Comprehensive `NotificationLog` tracking every generated link and recipient phone.
  - Meta Webhook verification handshake and delivery status ingestion endpoints.
- **Super Admin SaaS Portal (Phase 6):**
  - Platform overview metrics aggregating total restaurants, active tenants, order counts, and GMV.
  - Dynamic subscription plans management (`STARTER`, `PRO`) and tenant assignment.
- **Dedicated Payment Records (Phase 8):**
  - Standalone `Payment` model tracking transaction amounts, currencies, settlement channels, attempt logs, and provider references.
  - Automatic synchronization between order fulfillment and cashier payment completion.
- **Idempotency Protection (Phase 3 Hardening):**
  - `IdempotencyKey` collection with 24-hour TTL.
  - Support for `Idempotency-Key` HTTP header on order placement to prevent duplicate charges and stock deductions on retry.
- **Privacy & Security Hardening (Phase 11):**
  - Masking customer phone numbers on public order tracking endpoints (`maskPhoneNumber`).
  - Request correlation ID middleware (`correlationIdMiddleware`) attaching `x-request-id` to all requests and responses.
- **Containerization & Deployment (Phase 10):**
  - Multi-stage `server/Dockerfile` (Node 22-alpine with non-root security).
  - Multi-stage `client/Dockerfile` (Node 22 build + Nginx 1.27 alpine serve).
  - Production `nginx.conf` with gzip compression, SPA fallback, and security headers.
  - `docker-compose.yml` for unified local staging and production deployment.
- **Documentation Suite (Phase 0 Deliverables):**
  - `PRODUCTION_AUDIT.md`, `PRODUCTION_ROADMAP.md`, `DATABASE_DESIGN.md`, `API_REFERENCE.md`, `SECURITY.md`, `DEPLOYMENT.md`, `OPERATIONS_RUNBOOK.md`, `CHANGELOG.md`.

### Changed
- Refactored `getPublicOrder` to return masked phone numbers protecting customer privacy.
- Enhanced `createPublicOrder` to verify idempotency keys before processing carts.
- Upgraded test suite with 84 automated tests across 8 test suites in Vitest.

### Fixed
- Fixed potential duplicate order placement on mobile network retries.
- Fixed inventory double-deductions through atomic portion decrements and cancellation rollbacks.
- Fixed missing transaction logs by isolating payments from orders.
