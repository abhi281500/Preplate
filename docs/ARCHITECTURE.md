# Preplate — System Architecture

## 1. Architectural Style
Preplate is designed as a **Modular Multi-Tenant Monolith** built with Node.js, Express, TypeScript, React, and MongoDB.

### Why Modular Monolith?
- Eliminates network serialization and distributed consensus overhead inherent to premature microservices.
- Enforces strict module domain boundaries so services can be extracted into microservices if volume warrants.
- Shared transactional consistency and single-command local development.

```
┌──────────────────────────────────────────────────────────────┐
│                  Client Application (React/Vite)             │
│   /r/:slug                /admin/restaurant   /admin/super   │
│   (Customer Web)          (Owner / KDS)       (SaaS Admin)   │
└──────────────────────────────┬───────────────────────────────┘
                               │ JSON REST API / HTTPS
┌──────────────────────────────▼───────────────────────────────┐
│                    Preplate Express Backend                  │
│                                                              │
│  ┌─────────────────────────┐   ┌──────────────────────────┐  │
│  │ Security & Context      │   │ Application Modules      │  │
│  │ • Helmet, CORS          │   │ • Auth (RBAC / JWT)      │  │
│  │ • Zod Validation        │   │ • Public Menu & Orders   │  │
│  │ • enforceTenantContext  │   │ • Restaurant Ops & KDS   │  │
│  │ • Central Error Handler │   │ • SaaS Super Admin       │  │
│  └─────────────────────────┘   └──────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────▼───────────────────────────────┐
│                 MongoDB Multi-Tenant Database                │
│   (Indexed by tenantId across all restaurant collections)    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Isolation Strategy
- **Shared Database, Shared Schema:** Every restaurant record (Categories, MenuItems, Orders, OrderHistory, Staff) contains a indexed `tenantId` field.
- **Server-Derived Context:** The client is never trusted to supply `tenantId`. `req.tenantId` is extracted directly from the verified cryptographic JWT bearer token via `enforceTenantContext`.
- **Query Scoping:** All database writes and queries inside restaurant routes explicitly attach `{ tenantId: req.tenantId }`.
- **Spoofing Detection:** If a request contains an explicit `x-tenant-id` header or body parameter that conflicts with the JWT's `tenantId`, the request is immediately rejected with `403 Forbidden`.

---

## 3. Order State Machine Architecture
Permitted state transitions are strictly governed:
```
PENDING_CONFIRMATION ──► ACCEPTED ──► PREPARING ──► READY ──► SERVED
        │
        ├──► REJECTED (Reason recorded)
        ├──► CANCELLED (By customer before acceptance)
        └──► EXPIRED (Exceeded autoRejectTimeoutMinutes)
```
- A rejected order cannot transition to `PREPARING`.
- A served order is terminal.
- Every state transition persists an immutable entry to `OrderStatusHistory` recording actor, timestamp, and metadata.
