# Preplate — Application Security Architecture & Threat Model

**Version:** 1.0.0-PROD  
**Classification:** Internal & Commercial SaaS Architecture  
**Security Standard:** OWASP Top 10 Aligned  

---

## 1. Multi-Tenant Data Protection & Boundary Enforcement

In a multi-tenant SaaS architecture, cross-tenant data leaks represent the highest operational and legal hazard. Preplate employs defense-in-depth isolation mechanisms:

### 1.1. Tenant Derivation Rule (Zero-Trust Client Identity)
- Under no circumstances does the backend accept or trust client-provided `tenantId` in request bodies or query parameters.
- Authenticated requests extract `tenantId` strictly from the cryptographically verified JWT payload (`req.user.tenantId`).
- For public storefront routes, `tenantId` is resolved exclusively via an indexed lookup against the registered `slug` in the database.

### 1.2. Cross-Tenant Violation Guards
- The `enforceTenantContext` middleware verifies that the user holds an active membership for the requested tenant.
- Any attempt to spoof headers (`x-tenant-id`) or query another tenant's documents triggers an immediate HTTP 403 Forbidden and writes an immutable record to `AuditLog`.

---

## 2. Authentication, Session Safety & RBAC

### 2.1. Cryptographic Password Security
- User passwords are required to meet strong complexity standards (minimum 8 characters, requiring mixed-case, numbers, and special characters).
- Password hashes are computed using `bcryptjs` with an adaptive work factor of 12 rounds.
- Plaintext passwords and hashes are permanently excluded from query projections via Mongoose schema definitions (`select: false`).

### 2.2. JWT Token Lifecycle
- Tokens are signed with HMAC SHA-256 (`HS256`) using a cryptographically randomized 64-character secret (`JWT_SECRET`).
- Standard token validity is 7 days (`JWT_EXPIRES_IN=7d`).
- Revocation check: On every authenticated request, the database validates that the user account status remains `ACTIVE`. Suspended accounts cannot execute API calls regardless of token expiry.

### 2.3. Role-Based Access Control (RBAC) Matrix

| Operation / Scope | `SUPER_ADMIN` | `RESTAURANT_OWNER` | `RESTAURANT_STAFF` | `KITCHEN_STAFF` | Public Customer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Platform Tenant Onboarding | Yes | No | No | No | No |
| Global Plan Configuration | Yes | No | No | No | No |
| Menu Item Pricing & Edits | Platform-wide | Own Tenant | Own Tenant | Read-Only | Read-Only |
| KDS Order Acceptance | No | Own Tenant | Own Tenant | Own Tenant | No |
| KDS Order Status Advance | No | Own Tenant | Own Tenant | Own Tenant | No |
| Order Rejection | No | Own Tenant | Own Tenant | No | No |
| Order Placement | No | No | No | No | Yes |
| Order Cancellation | No | Own Tenant | Own Tenant | No | Pre-Acceptance |

---

## 3. Data Privacy & Customer PII Protection

### 3.1. Public Phone Number Masking (Phase 11 Compliance)
- Customer order tracking pages (`/r/:slug/order/:orderReference`) must not reveal raw customer telephone numbers to prevent link harvesting or identity snooping.
- All public order representations run through `maskPhoneNumber()`:
  - Format: `+91 98****3210` (preserving country code and 2 initial/4 terminal digits while masking middle digits).
  - Unmasked phone numbers are only visible to authenticated restaurant staff within their protected dashboard.

---

## 4. Financial & Pricing Integrity

### 4.1. Server-Authoritative Price Calculation
- The client sends only `menuItemId` and `quantity`.
- The server retrieves current menu item prices directly from MongoDB and computes subtotal, 5% GST, and grand total.
- Any client-submitted total or tax figure is disregarded.

### 4.2. Immutable Line-Item Snapshots
- Item name and unit price are snapshotted into `items[].nameSnapshot` and `items[].priceSnapshot` upon checkout.
- Subsequent price edits or item archiving by the restaurant do not change historical order totals or customer receipts.

### 4.3. Anti-Replay Idempotency Keys
- Pre-arrival ordering supports the `Idempotency-Key` HTTP header.
- Cached in `idempotency_keys` with a 24-hour TTL.
- Eliminates duplicate order creation and redundant inventory portion deductions on mobile network retries.

---

## 5. Network Defense & Threat Mitigations

| Threat Vector | Mitigation Strategy | Implementation |
| :--- | :--- | :--- |
| **Cross-Site Scripting (XSS)** | Secure HTTP headers | Helmet middleware enforces `Content-Security-Policy`, `X-XSS-Protection`, `X-Content-Type-Options: nosniff`. |
| **Cross-Origin Resource Sharing (CORS)** | Strict Origin Whitelist | Configured via `cors()` with origin locked to `CLIENT_ORIGIN` and local development ports. |
| **Brute Force & DDoS** | Sliding-Window Rate Limiting | Auth endpoints limited to 10 requests / 15 minutes; public order routes limited to 60 requests / minute. |
| **SQL/NoSQL Injection** | Strict Zod Schema Parsing | Inputs sanitized through Zod runtime type parsers; queries use strongly typed Mongoose objects without raw eval. |
| **Log Traceability** | Distributed Correlation ID | `correlationIdMiddleware` assigns UUID `x-request-id` to every request for audit trails. |
