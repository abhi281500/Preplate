# Preplate — Notification Subsystem & WhatsApp Integration

**Version:** 1.0.0-PROD  
**Modes:** `CLICK_TO_CHAT` (Zero-Cost Default) & `META_CLOUD_API` (Automated Background)  

---

## 1. Zero-Cost Click-to-Chat Architecture

Preplate uses standard WhatsApp deep linking to provide zero-cost messaging without requiring third-party subscription fees or Meta Business Manager approvals:

### Deep Link URL Structure:
```
https://wa.me/{cleanRestaurantWhatsApp}?text={encodedPreformattedMessage}
```

### Preformatted Message Format:
```
🍽️ PREPLATE ORDER REQUEST
Ref: #ORD-20261027-AB12
Restaurant: Highway Dhaba Express
Customer: Arjun Verma (+91 99****6655)
Expected Arrival: 14:30
--------------------------
• 2x Dal Makhani (₹440)
--------------------------
Subtotal: ₹440
Taxes (GST 5%): ₹22
Total Order Value: ₹462
Advance Paid (25%): ₹116
Remaining Due on Arrival: ₹346
Special Notes: "Serving upon arrival"
--------------------------
Track Live Status:
https://preplate.io/r/highway-dhaba/order/ORD-20261027-AB12
```

---

## 2. Notification Audit Logging (`notification_logs`)

Every notification interaction persists a document in MongoDB:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `tenantId` | String | Scoped restaurant tenant identifier |
| `orderId` | ObjectId | Associated order document ID |
| `orderReference` | String | Human-readable order code |
| `recipientPhone` | String | Sanitized recipient mobile number |
| `recipientRole` | Enum | `RESTAURANT` or `CUSTOMER` |
| `purpose` | Enum | `ORDER_SUBMITTED_REQUEST`, `ORDER_ACCEPTED_ALERT`, `ORDER_READY_ALERT`, `ORDER_REJECTED_ALERT` |
| `status` | Enum | `LOGGED`, `SENT`, `DELIVERED`, `READ`, `FAILED` |
| `messagePayload` | String | Rendered text message content |
| `createdAt` | Date | Timestamp of link dispatch or API call |

---

## 3. Meta Cloud API Webhook Readiness

The backend provides endpoints for automated two-way WhatsApp Cloud API messaging:
1. **Webhook Verification Handshake (`GET /api/v1/webhook`):** Responds to Meta `hub.challenge` when `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. **Delivery Status Receipt Ingestion (`POST /api/v1/webhook`):** Ingests incoming status webhooks (`sent`, `delivered`, `read`) and updates the corresponding `NotificationLog` entry.
