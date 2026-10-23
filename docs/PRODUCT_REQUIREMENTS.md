# Preplate — Product Requirements Document (PRD)

## 1. Product Vision & Positioning
**Preplate** is a B2B multi-tenant SaaS platform that enables restaurants (dine-in, cafes, highway eateries, college outlets) to accept and coordinate customer orders **prior to arrival**.

Preplate solves the acute friction of table-side or counter wait times:
- Traditional dining involves 20–40 minutes of cumulative idle waiting (menu delivery, ordering, kitchen queue, food preparation).
- Preplate empowers guests to order with a specific Expected Arrival Time (ETA).
- Restaurants review, verify capacity, and accept orders with realistic preparation duration estimates.
- Kitchen operations fire orders synchronously with guest arrival.

### What Preplate is NOT:
- Not a food delivery aggregator (no riders, no 25–30% delivery commissions).
- Not a false "zero-wait guarantee" engine: kitchen workloads and transit delays are managed transparently.

---

## 2. Target Segments & User Personas

| Segment | Pain Point | Preplate Value |
|---|---|---|
| **Highway & Expressway Eateries** | Travelers on tight schedules bypass restaurants with long waits. | Travelers pre-order 25-45 minutes before exit; food is ready upon arrival. |
| **Tech Parks & Corporate Cafes** | 30-minute lunch breaks wasted waiting for food preparation. | Employees order from desks; arrive at cafeteria with table/tray ready. |
| **Family & Casual Dine-in** | Weekend table turnover is slow (60-80 mins per party). | Reduces turnover to 35-45 mins, increasing weekend revenue by 25-35%. |
| **College & Campus Outlets** | 15-minute rush between lectures causes queue drop-offs. | Rapid pickup counters coordinated via order reference. |

---

## 3. Core Feature Requirements

### A. Customer Experience (Guest Checkout)
1. **Zero Mandatory Sign-up:** Customers order via `/r/:slug` on mobile/desktop without friction.
2. **Dynamic Menu & Live Availability:** Real-time dietary badges (Veg/Non-Veg), descriptions, prices (INR), and immediate "Sold Out" indicators.
3. **Arrival Time Selection:** Customers select ETA. Backend enforces store hours and minimum prep buffer.
4. **Order Status Tracking:** Live tracking page (`/r/:slug/order/:orderReference`) with state progress, estimated ready time, and WhatsApp coordination button.

### B. Restaurant Operations
1. **Real-time Order Queue:** Distinct audio/visual alerts for new incoming requests.
2. **Acceptance with Prep Estimation:** Operator can accept with a chosen preparation duration or reject with a reason.
3. **Kitchen Display System (KDS):** Streamlined interface for kitchen staff to transition orders: `ACCEPTED` → `PREPARING` → `READY` → `SERVED`.
4. **1-Click Stock Management ("86ing"):** Toggle menu item availability instantly during peak service.
5. **Operational Analytics:** Order acceptance rate, average confirmation speed, kitchen prep duration, and revenue.

### C. SaaS Super Admin
1. **Multi-Tenant Account Directory:** Onboard, activate, monitor, and suspend restaurant accounts.
2. **Configurable Subscription Plans:** Database-driven plan tiers (Starter, Pro, Enterprise) with dynamic pricing in INR.
3. **Audit & Incident Logging:** Platform-wide transparency on administrative actions and integration health.
