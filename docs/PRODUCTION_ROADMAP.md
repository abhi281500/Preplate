# Preplate — SaaS Production Roadmap & Delivery Plan

**Version:** 1.0.0-PROD  
**Target Release:** Q4 2026 Commercial Rollout  

---

## Roadmap Overview

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
Discovery    Security    Menu &      Order       KDS &       WhatsApp    Multi-Tenant
& Audit      Core        Storefront  Engine      Ops         Alerts      Super Admin
                                                                            │
Phase 12 ◄── Phase 11 ◄── Phase 10 ◄── Phase 9 ◄── Phase 8 ◄── Phase 7 ◄────┘
SLA & Ops    Data Privacy Production  Analytics  Payment     Hardening &
Runbook      & Security   Docker      & Reporting Providers   E2E Lifecycle
```

---

## Phase Details & Milestone Status

### Phase 0: Repository Discovery, Baseline Audit & Documentation
- **Status:** COMPLETED
- **Objectives:** Inspect existing repository stack, run automated baseline tests, perform gap analysis, and document architectural blueprints.
- **Key Deliverables:**
  - `docs/PRODUCTION_AUDIT.md` (Risk matrix, P0-P3 classifications)
  - `docs/PRODUCTION_ROADMAP.md` (Milestone progress tracking)
  - `docs/DATABASE_DESIGN.md` (Tenant-isolated schema models)
  - `docs/API_REFERENCE.md` (Comprehensive endpoint catalog)
  - `docs/SECURITY.md` (Threat models and mitigations)
  - `docs/DEPLOYMENT.md` (Container & hosting specifications)
  - `docs/OPERATIONS_RUNBOOK.md` (Incident response and operational SOPs)
  - `docs/CHANGELOG.md` (Chronological record of platform upgrades)

### Phase 1: Multi-Tenant Foundation & Security Core
- **Status:** COMPLETED
- **Objectives:** Tenant-isolated data models, cryptographic password hashing, JWT sessions, role-based access control (RBAC), and cross-tenant violation guards.
- **Key Deliverables:**
  - `Restaurant` and `User` models with compound indexes
  - `authenticateJWT` and `enforceTenantContext` middlewares
  - `AuditLog` collection capturing security and access events
  - Automated test suite: `server/src/tests/authAndTenantIsolation.test.ts` (9 tests passing)

### Phase 2: Restaurant Storefront & Menu Inventory Controls
- **Status:** COMPLETED
- **Objectives:** Public customer menu browsing, category grouping, food-type filtering (VEG / NON_VEG / VEGAN), and real-time portion stock tracking.
- **Key Deliverables:**
  - `Category` and `MenuItem` schemas supporting portion limits (`dailyStockLimit`, `availableQuantity`, `ordersCountToday`)
  - Public menu browsing endpoints (`GET /api/v1/public/restaurants/:slug/menu`)
  - Restaurant owner menu management controller with auto-86ing when portions deplete
  - Automated test suite: `server/src/tests/menuAndProfile.test.ts` (17 tests passing)

### Phase 3: Pre-Arrival Ordering Engine & Server-Calculated Pricing
- **Status:** COMPLETED
- **Objectives:** Server-side price calculation, 5% GST tax computation, pre-arrival time buffer enforcement, immutable line-item snapshotting, and idempotency guarantees.
- **Key Deliverables:**
  - `Order` model with immutable `nameSnapshot`, `priceSnapshot`, and `subtotal`
  - `IdempotencyKey` collection with 24-hour TTL preventing duplicate checkout charges
  - Preparation buffer validation against restaurant `orderBufferMinutes`
  - Automated test suite: `server/src/tests/orderEngine.test.ts` (10 tests passing)

### Phase 4: Kitchen Operations & Kitchen Display System (KDS)
- **Status:** COMPLETED
- **Objectives:** Live incoming order queue, progressive state machine (`PENDING_CONFIRMATION` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`), rejection reasons, and automatic inventory rollback on cancellation.
- **Key Deliverables:**
  - Order management controllers (`getRestaurantOrders`, `acceptOrder`, `rejectOrder`, `updateOrderStatus`)
  - `OrderStatusHistory` timeline logging every state change and acting user
  - Responsive KDS interface in client dashboard with live audio chime cues
  - Automated test suite: `server/src/tests/restaurantOperations.test.ts` (9 tests passing)

### Phase 5: WhatsApp-Assisted Coordination & Notification Logging
- **Status:** COMPLETED
- **Objectives:** Zero-cost Click-to-Chat WhatsApp deep linking, template generation, webhook handshake endpoint for Meta Cloud API readiness, and delivery tracking.
- **Key Deliverables:**
  - Sanitized WhatsApp URL generator (`buildWhatsAppLink`)
  - `NotificationLog` model recording every generated link and recipient
  - Meta Webhook verification handshake (`GET /api/v1/webhook`) and status ingestion
  - Automated test suite: `server/src/tests/whatsappNotification.test.ts` (10 tests passing)

### Phase 6: Multi-Tenant SaaS Administration & Super Admin Portal
- **Status:** COMPLETED
- **Objectives:** Platform-wide Super Admin dashboard, dynamic subscription tier plans, tenant onboarding, subscription status management, and aggregated platform GMV metrics.
- **Key Deliverables:**
  - `SubscriptionPlan` and `Subscription` schemas
  - Super Admin controllers (`getPlatformOverview`, `listAllRestaurants`, `manageRestaurantStatus`, `createPlan`)
  - Super Admin frontend portal (`/admin`)
  - Automated test suite: `server/src/tests/superAdminManagement.test.ts` (12 tests passing)

### Phase 7: System Hardening, E2E Lifecycle & Regression Tests
- **Status:** COMPLETED
- **Objectives:** Comprehensive end-to-end multi-tenant lifecycle testing verifying the entire SaaS flow from onboarding to order fulfillment.
- **Key Deliverables:**
  - End-to-End integration test suite: `server/src/tests/endToEndLifecycle.test.ts` (12 tests passing)
  - Tenant boundary verification: `server/src/tests/tenantEnforcement.test.ts` (5 tests passing)
  - Total test coverage: 8 suites, 84 tests passing cleanly

### Phase 8: Separate Payment Architecture & Settlement Workflows
- **Status:** COMPLETED
- **Objectives:** Standalone `Payment` collection tracking individual transactions, provider references, cashier settlements, and payment state machines.
- **Key Deliverables:**
  - `Payment` model with `PENDING`, `COMPLETED`, `FAILED`, and `REFUNDED` statuses
  - Automatic synchronization with order lifecycle (marking payment `COMPLETED` when order is `SERVED`)
  - Verification in `orderEngine.test.ts`

### Phase 9: Analytics, Reporting & Audit Logs
- **Status:** COMPLETED
- **Objectives:** Order metrics, daily sales volume, GMV, acceptance rates, and tamper-resistant audit logs.
- **Key Deliverables:**
  - Aggregation queries in Super Admin and Restaurant dashboards
  - Structured audit trail (`AuditLog`) for critical administrative and auth actions

### Phase 10: Production Docker & Container Orchestration
- **Status:** COMPLETED
- **Objectives:** Multi-stage container builds, non-root execution, Nginx SPA routing, healthcheck probes, and Compose orchestration.
- **Key Deliverables:**
  - `server/Dockerfile` (Node 22-alpine multi-stage)
  - `client/Dockerfile` (Node 22 builder + Nginx 1.27 runner)
  - `client/nginx.conf` (SPA fallback, gzip, security headers)
  - `docker-compose.yml` (Preplate MongoDB, API, and Web containers)
  - `.dockerignore` files for server, client, and project root

### Phase 11: Data Privacy & Compliance (Customer Phone Masking)
- **Status:** COMPLETED
- **Objectives:** Protect customer PII against link harvesting and unauthorized tracking snooping.
- **Key Deliverables:**
  - Public order tracking endpoint (`GET /api/v1/public/restaurants/:slug/orders/:orderReference`) masks phone numbers (e.g. `+91 98****3210`)
  - Input validation sanitization preventing script injection

### Phase 12: Production Operations Runbook & SLA Management
- **Status:** COMPLETED
- **Objectives:** Operational standard operating procedures (SOPs), incident runbooks, disaster recovery plans, and monitoring protocols.
- **Key Deliverables:**
  - `docs/OPERATIONS_RUNBOOK.md`
  - `docs/DEPLOYMENT.md`
