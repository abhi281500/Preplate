# Preplate — Production SaaS Implementation Roadmap

**Version:** 1.0.0-PROD  
**Target:** Production-Grade Multi-Tenant SaaS Commercial Readiness  

---

## Roadmap Overview & Phase Sequence

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
Audit &     Design &    Dual OTP    Database    25% Advance Admin &     Security    Staging &
Planning    UI/UX       Auth Core   & Cart      & Payments  KDS Ops     Testing     Production
```

---

## Detailed Phase Breakdown & Acceptance Criteria

### Phase 1 — Audit and Planning (CURRENT)
- [x] Inspect existing monorepo structure, dependencies, and controllers.
- [x] Verify baseline tests (8 suites, 84 passing tests) and builds (server & client).
- [x] Create comprehensive `docs/PRODUCTION_AUDIT.md`.
- [x] Create system architecture blueprint `docs/ARCHITECTURE.md`.
- [x] Create execution roadmap `docs/IMPLEMENTATION_ROADMAP.md`.
- [x] Create `docs/ENVIRONMENT_SETUP.md` with environment variables catalog.

### Phase 2 — Foundation and UI/UX Refinements
- [ ] Implement persistent client cart in `CartContext.tsx` using `localStorage` keyed by restaurant slug (`preplate_cart_${slug}`) so cart survives page refreshes and navigation.
- [ ] Visually differentiate demo restaurants (`highway-dhaba`, `urban-spice`) with explicit "Practice / Demo Environment" badges.
- [ ] Add explicit Terms of Service, Privacy Policy, and Refund Policy disclosures to checkout and landing pages.
- [ ] Ensure responsive mobile-first layouts without horizontal scroll glitches.
- [ ] Verify client build succeeds cleanly.

### Phase 3 — Dual-Flow OTP Authentication Core
- [ ] Create `server/src/models/OtpChallenge.ts` schema:
  - `challengeId` (UUID, indexed)
  - `phone` (string, indexed)
  - `hmacHash` (HMAC-SHA256 of 6-digit code)
  - `purpose` (`RESTAURANT_REGISTRATION` | `CUSTOMER_CHECKOUT`)
  - `expiresAt` (Date, TTL 5 minutes)
  - `attempts` (number, max 5)
  - `isConsumed` (boolean, default false)
- [ ] Create `server/src/services/otpService.ts` supporting cryptographic 6-digit generation, HMAC hashing, cooldown checking, and SMS provider boundary (with test mock fallback).
- [ ] Implement API endpoints:
  - `POST /api/v1/auth/otp/send`
  - `POST /api/v1/auth/otp/verify`
- [ ] Wire Flow A: Restaurant owner registration with verified phone OTP challenge.
- [ ] Wire Flow B: Customer checkout verification with checkout-scoped OTP challenge.
- [ ] Author comprehensive automated test suite: `server/src/tests/otpAuthentication.test.ts`.

### Phase 4 — Database Design, Persistent Cart & Order Lifecycle
- [ ] Expand `Order` schema to record:
  - `advancePercent` (Number, default 25)
  - `requiredAdvanceAmount` (Number, integer in paise/rupees)
  - `capturedAdvanceAmount` (Number)
  - `remainingBalanceAmount` (Number)
  - `guestSessionId` (String, optional)
- [ ] Support progressive order states:
  - `PENDING_PAYMENT`
  - `PENDING_CONFIRMATION`
  - `ACCEPTED`
  - `PREPARING`
  - `READY`
  - `SERVED`
  - `REJECTED`
  - `CANCELLED`
- [ ] Add atomic inventory reservation decrement and replenishment on cancellation.

### Phase 5 — Minimum 25% Advance Payment & Gateway Webhooks
- [ ] Update `order.controller.ts` to compute:
  - `requiredAdvance = Math.ceil(totalAmount * (restaurant.settings.advancePercent || 25) / 100)`
  - `remainingBalance = totalAmount - requiredAdvance`
- [ ] Create `server/src/services/paymentService.ts`:
  - Create payment attempt record in `Payment` collection.
  - Razorpay order creation integration boundary.
  - Webhook signature verification (`crypto.createHmac('sha256', secret)`).
  - Handle payment states (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`).
- [ ] Implement refund initiation workflow when restaurant rejects an order after advance capture.
- [ ] Author automated test suite: `server/src/tests/advancePayment.test.ts`.

### Phase 6 — Admin Dashboard, KDS Operations & Notifications
- [ ] Enhance Kitchen Display System (KDS) cards with:
  - Expected arrival countdown timer.
  - 25% advance captured badge + remaining balance collectable on delivery.
  - One-click accept with preparation duration input.
- [ ] Update WhatsApp link and template generators to include verified advance deposit amount and remaining balance due at counter.
- [ ] Record all notification dispatches in `NotificationLog`.

### Phase 7 — Security, Hardening & Regression Verification
- [ ] Verify tenant boundary enforcement across all endpoints.
- [ ] Verify phone masking on all public order views.
- [ ] Verify idempotency key deduplication.
- [ ] Run full automated test suite (all previous suites + new OTP and Advance Payment suites).
- [ ] Verify 0 TypeScript errors on server and client.

### Phase 8 — Staging & Production Deployment Readiness
- [ ] Verify Docker Compose orchestration (`preplate-mongodb`, `preplate-api`, `preplate-web`).
- [ ] Document production runbooks and environment setup in `docs/ENVIRONMENT_SETUP.md` and `docs/PRODUCTION_RUNBOOK.md`.
- [ ] Perform deployment smoke tests.
