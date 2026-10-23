# Preplate — WhatsApp Integration Specification

## 1. Architectural Philosophy
WhatsApp is an **assisted communication and notification channel**, **not** the primary database or transaction authority.
- The Preplate backend remains the single source of truth for orders, inventory, pricing, and status.
- Notification delivery failures never compromise order integrity.

---

## 2. Implementation Tiers

### Tier 1: Click-to-WhatsApp MVP (Active Implementation)
- **Deep Link Engine:** Uses `https://wa.me/<whatsappNumber>?text=<encodedMessage>`.
- **Message Payload:**
  ```text
  🍽️ PREPLATE ORDER REQUEST
  Ref: #ORD-20261024-K9X1
  Restaurant: Highway Dhaba Express
  Customer: Rajesh Kumar (Phone: +919876500000)
  ETA: 01:30 PM (in 35 mins)
  --------------------------
  • 2x Butter Chicken (Boneless) @ ₹340 = ₹680
  • 4x Butter Naan @ ₹45 = ₹180
  --------------------------
  Total: ₹860 (Pay at Restaurant)
  Notes: Please keep mild spicy
  Live Status: https://preplate.io/r/highway-dhaba/order/ORD-20261024-K9X1
  ```
- **Explicit Transparency:** The customer is clearly informed:
  > *"Clicking the button opens WhatsApp with your order details pre-filled. You must press Send in WhatsApp to deliver the message to the restaurant."*

### Tier 2: Meta Cloud API / WhatsApp Business Platform (Enterprise Post-Pilot)
- Direct server-to-server dispatch using official WhatsApp Cloud API templates.
- Inbound webhooks for delivery status receipts (`sent`, `delivered`, `read`).
- Encapsulated behind `INotificationService` interface for drop-in configuration without altering business logic.
