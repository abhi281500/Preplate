# Preplate — Automated Testing & Quality Acceptance Matrix

**Version:** 1.0.0-PROD  
**Test Framework:** Vitest 3.2.7 + Supertest 7.0.0  
**Database Isolation:** In-Memory MongoDB (`mongodb-memory-server` 10.1)  
**Total Test Suites:** 9 suites | **Total Passing Tests:** 96 tests (100% Pass Rate)  

---

## 1. Test Suite Catalog & Functional Verification

| Test Suite File | Tests | Domain Tested |
| :--- | :---: | :--- |
| `authAndTenantIsolation.test.ts` | 9 | Super admin authentication, owner onboarding, cross-tenant 403 enforcement |
| `endToEndLifecycle.test.ts` | 12 | Complete SaaS lifecycle: subscription -> registration -> menu -> order -> KDS -> GMV |
| `menuAndProfile.test.ts` | 17 | Category sorting, portion inventory limits, auto-86ing, profile updates |
| `orderEngine.test.ts` | 10 | Pricing calculations, immutable snapshots, arrival buffers, phone masking, idempotency |
| `otpAndAdvancePayment.test.ts` | 12 | Dual-flow OTP (Owner vs Customer), HMAC hashing, 25% advance, 100% refund on decline |
| `restaurantOperations.test.ts` | 9 | KDS active queue, status transitions, kitchen prep duration, rejection handling |
| `superAdminManagement.test.ts` | 12 | Dynamic subscription plans, tenant suspension, platform GMV analytics |
| `tenantEnforcement.test.ts` | 5 | Boundary enforcement, spoofing detection, database query isolation |
| `whatsappNotification.test.ts` | 10 | WhatsApp deep link generation, notification logs, Meta webhook handshakes |

---

## 2. Test Execution Command & Verification Output

To run all automated test suites:
```powershell
npm --prefix server test
```

### Verified Test Run Output:
```
 RUN  v3.2.7 C:/Restaurant/server

 ✓ src/tests/orderEngine.test.ts (10 tests)
 ✓ src/tests/otpAndAdvancePayment.test.ts (12 tests)
 ✓ src/tests/superAdminManagement.test.ts (12 tests)
 ✓ src/tests/tenantEnforcement.test.ts (5 tests)
 ✓ src/tests/endToEndLifecycle.test.ts (12 tests)
 ✓ src/tests/whatsappNotification.test.ts (10 tests)
 ✓ src/tests/menuAndProfile.test.ts (17 tests)
 ✓ src/tests/restaurantOperations.test.ts (9 tests)
 ✓ src/tests/authAndTenantIsolation.test.ts (9 tests)

 Test Files  9 passed (9)
      Tests  96 passed (96)
   Duration  15.66s
```

---

## 3. Production Acceptance Criteria Checklist

- [x] Customers can browse menus, add items to cart, and refresh the browser without losing cart items.
- [x] Customer mobile number can be verified via cryptographically secure 6-digit OTP (HMAC-SHA256).
- [x] Restaurant owner can register and verify business phone number via separate OTP challenge.
- [x] Minimum 25% advance payment is calculated and enforced on the server.
- [x] Standalone `Payment` records track transaction amounts, statuses, and attempts.
- [x] If a restaurant declines an order, 100% of the advance payment is marked as `REFUNDED`.
- [x] Customer phone numbers are masked (`+91 98****3210`) on public tracking endpoints.
- [x] Duplicate order placement on mobile network retries is blocked via 24-hr TTL `IdempotencyKey`.
- [x] Zero cross-tenant data leaks: tenant users cannot access other restaurants' orders or menus.
- [x] Server and Client production builds compile with 0 TypeScript or bundler errors.
