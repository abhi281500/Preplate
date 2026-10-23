# Preplate — Testing Strategy & Verification Guide

## 1. Test Architecture
Tests are implemented using **Vitest**, **Supertest**, and **mongodb-memory-server**.

### Why In-Memory Database for Tests?
- **Zero External Dependencies:** Tests execute self-contained in CI/CD and sandbox environments without needing a live external MongoDB daemon or open network ports.
- **Complete Test Isolation:** Each test suite spins up a fresh ephemeral instance or cleans collections between runs, guaranteeing no state leakage.

---

## 2. Test Execution Commands

```bash
# Run all backend integration tests
cd server
npm test

# Run tests in watch mode during development
npm run test:watch
```

---

## 3. Verified Scenarios
- **Health & Lifecycle:** `/health` endpoint status.
- **Super Admin Auth:** Platform-level login and JWT payload validation.
- **Tenant Auth:** Restaurant Owner login with attached tenant identity and status checks.
- **Input Validation:** Zod rejection of invalid emails, weak passwords, and illegal slug characters.
- **Slug Uniqueness:** Rejection of duplicate restaurant registration attempts (HTTP 409).
- **Tenant Isolation:** Verification that users cannot access or spoof cross-tenant records.
- **State Machine Integrity:** Enforcing permitted status transitions and rejection reasons.
