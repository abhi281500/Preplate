# Preplate — Security & Threat Modeling

## 1. Multi-Tenant Data Protection
- **No Client-Side Trust:** The client application never dictates `tenantId`. Even if an attacker modifies local state or injects `tenantId` in request bodies, backend controllers bind queries strictly to `req.tenantId` derived from the verified JWT.
- **Tenant Isolation Enforcement:** The `enforceTenantContext` middleware checks that `req.user.tenantId` is present and active. Any attempt to spoof headers (`x-tenant-id`) is immediately flagged as a cross-tenant violation (HTTP 403) and logged to `AuditLog`.

---

## 2. Cryptographic Authentication & Session Safety
- **Password Security:** Passwords hashed using `bcryptjs` with a work factor of 12 rounds. Plaintext passwords are never logged, echoed, or stored.
- **JWT Protection:** Signed with an HMAC SHA-256 secret key (`JWT_SECRET`, minimum 32 chars). Tokens expire in 7 days (`JWT_EXPIRES_IN`). Token revocation is supported via account status checks on every authenticated request.
- **Role-Based Access Control (RBAC):** Explicit role guards (`SUPER_ADMIN`, `RESTAURANT_OWNER`, `RESTAURANT_STAFF`). Kitchen staff cannot access financial reports or delete menus.

---

## 3. Financial & Pricing Integrity
- **Price Calculation Guarantee:** The client sends only `menuItemId` and `quantity`. The backend retrieves active prices from MongoDB and performs all sum, tax, and total calculations. Client-calculated prices are rejected.
- **Immutable Snapshots:** When an order is placed, item names and unit prices are snapshot into `items[].nameSnapshot` and `items[].priceSnapshot`. Subsequent menu price edits by the restaurant never alter historical order records.

---

## 4. Network & Input Sanitization
- **HTTP Security Headers:** Powered by `helmet()`.
- **CORS:** Restricted to verified client origins (`CLIENT_ORIGIN`).
- **Input Validation:** Strict parsing via Zod schemas on all endpoints. Malformed inputs are rejected with 400 Bad Request before hitting controllers.
- **Secret Protection:** Production secrets are loaded from environment variables. A placeholder `.env.example` is committed; real `.env` files are ignored by git.
