# Preplate — SaaS Production Audit & Baseline Gap Analysis

**Audit Date:** October 2026  
**Auditor:** Senior Full-Stack Engineer, Security Architect & SaaS DevOps Team  
**Scope:** Full Stack Monorepo (`/server`, `/client`, `/docs`, `/config`)  
**Baseline Test Status:** 8 suites passed, 84 tests passed (0 failures)  
**Baseline Build Status:** Server `tsc` passed, Client Vite build passed (0 errors)  

---

## 1. Executive Summary & Audit Baseline

Preplate is a multi-tenant SaaS platform coordinating pre-arrival food ordering, kitchen preparation buffers, advance payment capture, and notification coordination for roadside eateries, dine-in restaurants, and highway dhabas.

This comprehensive audit establishes the technical baseline, records build and test metrics, catalogues external service dependencies, and categorizes newly identified functional gaps (such as dual-flow OTP verification, minimum 25% advance payment calculation, and guest cart persistence) into a prioritized engineering roadmap.

---

## 2. Technology Stack & Framework Inventory

| Component | Framework / Tool | Version | Architecture Role & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Backend API** | Node.js / Express | Node 22.x / Express 4.21.2 | Modular REST API with TypeScript, centralized error handling, request correlation |
| **Database & ODM** | MongoDB / Mongoose | MongoDB 7.0 / Mongoose 8.9.5 | Multi-tenant compound-indexed collections partitioned by `tenantId` |
| **Data Validation** | Zod | 3.24.1 | Strict runtime parsing and sanitization of request params, queries, and payloads |
| **Authentication** | JWT & Bcrypt | `jsonwebtoken` 9.0 / `bcryptjs` 2.4 | HMAC-SHA256 tokens (7-day validity), 12-round salted password hashing |
| **Frontend Web** | React / Vite | React 18.3.1 / Vite 6.4.5 | TypeScript Single Page Application (SPA), React Router v6, Tailwind CSS 3.4.1 |
| **Testing Suite** | Vitest / Supertest | Vitest 3.2.7 / Supertest 7.0.0 | In-memory integration testing with `mongodb-memory-server` 10.1 |
| **Containerization** | Docker / Compose | Node 22-alpine / Nginx 1.27 | Multi-stage production container images with healthchecks and SPA fallback |

---

## 3. Audited Baseline Test & Build Verification

The baseline check was executed across the entire repository prior to new modifications:

```
Test Execution:
- Test Files: 8 passed (8)
- Test Cases: 84 passed (84)
- Test Duration: 10.73s
- Suites Verified:
  1. authAndTenantIsolation.test.ts (9 tests)
  2. endToEndLifecycle.test.ts (12 tests)
  3. menuAndProfile.test.ts (17 tests)
  4. orderEngine.test.ts (10 tests)
  5. restaurantOperations.test.ts (9 tests)
  6. superAdminManagement.test.ts (12 tests)
  7. tenantEnforcement.test.ts (5 tests)
  8. whatsappNotification.test.ts (10 tests)

Build Execution:
- Server TypeScript Compilation (`tsc`): 0 errors, output generated in server/dist/
- Client Production Bundle (`tsc && vite build`): 0 errors, 1710 modules transformed, output in client/dist/
```

---

## 4. Comprehensive Vulnerability & Gap Matrix

| Priority | Dimension | Current State | Target Production Requirement | Risk / Impact |
| :---: | :--- | :--- | :--- | :--- |
| **P0** | **Authentication & Verification** | Restaurant registration and customer checkout accept unverified phone numbers. | Implement two independent OTP flows: (1) Owner Registration OTP, (2) Customer Checkout OTP, storing HMAC-hashed challenges with 5-min expiry and attempt throttling. | High: Fake reservations, unverified phone spoofing, abusive order requests. |
| **P0** | **Payment & Financial Integrity** | Checkout defaults to full payment at restaurant with no mandatory deposit. | Enforce minimum 25% advance calculation server-side (`requiredAdvance = ceil(total * 0.25)`), independent payment state machine (`PENDING`, `AUTHORIZED`, `CAPTURED`, `REFUNDED`), and signed webhook verification. | High: Food wastage from no-show diners who abandon orders without financial commitment. |
| **P1** | **Cart Persistence & Guest UX** | Cart items live solely in ephemeral React state (`useState`) and disappear on refresh. | Local storage persistence scoped to restaurant slug (`preplate_cart_${slug}`) plus backend cart revalidation before checkout. | Medium: Lost customer progress upon page refresh or accidental back navigation. |
| **P1** | **Customer PII Exposure** | Historical tracking exposed customer phone numbers publicly. | **RESOLVED:** Mask customer phone (`+91 98****3210`) on public tracking endpoints via `maskPhoneNumber()`. | Closed PII leak. |
| **P1** | **Duplicate Order Prevention** | Rapid mobile network retries could submit duplicate orders. | **RESOLVED:** Implemented `IdempotencyKey` collection with 24-hr TTL and `Idempotency-Key` header handling. | Closed duplication risk. |
| **P1** | **Independent Payment Records** | Embedded subdocument lacked transaction history and cashier attempts. | **RESOLVED:** Standalone `Payment` collection tracking amounts, gateways, attempt logs, and settlement status. | Auditable financial history. |
| **P2** | **Demo Environment Disclosure** | Demo restaurants (`highway-dhaba`, `urban-spice`) appear as live businesses. | Explicitly display "DEMO RESTAURANT - PRACTICE ENVIRONMENT" badges on storefront and landing pages. | Medium: Diner confusion attempting to order real food from sample accounts. |
| **P2** | **Notification Reliability** | Click-to-Chat deep links are generated synchronously. | Maintain transactional `NotificationLog` trail with retryable job payloads and Meta Cloud API webhook ingestion readiness. | Low: Customer communication dropouts during traffic surges. |
| **P3** | **Compliance & Documentation** | Terms of service, cancellation policy, and refund rules were not linked on checkout. | Add explicit terms modal and refund policy disclosure (mandatory 100% refund of 25% advance if restaurant declines order). | Low: Chargeback and customer dispute ambiguity. |

---

## 5. External Provider Dependencies & Integration Boundaries

1. **SMS / OTP Delivery Gateway:**
   - *Target Providers:* Fast2SMS (India DLT), Twilio, or MSG91.
   - *Integration Boundary:* In local/staging environments (`NODE_ENV=development` or `test`), server outputs verification codes to server console and test response headers for automated testing without charging SMS credits. In production, requires `SMS_PROVIDER_API_KEY`.
2. **Online Payment Gateway:**
   - *Target Provider:* Razorpay (UPI, Credit/Debit cards, Netbanking).
   - *Integration Boundary:* In test/staging, mock Razorpay order generation and webhook signature verification using test key/secret (`rzp_test_...`). In production, requires live merchant credentials and signed webhook endpoint (`/api/v1/webhook/razorpay`).
3. **WhatsApp Messaging Gateway:**
   - *Target Provider:* WhatsApp Business API (Meta Cloud API).
   - *Integration Boundary:* Default zero-cost `CLICK_TO_CHAT` deep linking requires zero credentials. For automated background notifications, system supports Meta Cloud API via `WHATSAPP_ACCESS_TOKEN` and webhook handshake verification (`hub.challenge`).

---

## 6. Multi-Tenant Isolation & Security Assessment

- **Zero-Trust Identity:** The backend never trusts client-supplied `tenantId` in request bodies. All database queries derive `tenantId` strictly from the cryptographically verified JWT token (`req.user.tenantId`).
- **Database Partitioning:** Compound indexes `{ tenantId: 1, ... }` are enforced on `Restaurant`, `User`, `Category`, `MenuItem`, `Order`, `Payment`, `AuditLog`, and `NotificationLog`.
- **Cross-Tenant Violation Trapping:** Attempting to query another restaurant's orders or revenue metrics returns HTTP 403 Forbidden and writes an immutable entry to `AuditLog`.

---

## 7. Audit Conclusion & Phase Transition

The baseline foundation is clean, verified, and free of syntax, build, or test regressions. We now proceed to execute Phase 2 through Phase 8 of the Production Master Plan.
