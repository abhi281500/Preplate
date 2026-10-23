# Preplate — Database Schema Reference

## Collections & Indexes

### 1. `restaurants`
Represents restaurant tenant profiles, operational hours, and ordering parameters.
- `tenantId` (String, Unique, Index)
- `name` (String, Required)
- `slug` (String, Unique, Index)
- `tagline` (String)
- `contactPhone` (String)
- `whatsappNumber` (String)
- `address`: `{ street, city, state, postalCode }`
- `operatingHours`: `[{ dayOfWeek: 0-6, openTime: "HH:mm", closeTime: "HH:mm", isOpen: Boolean }]`
- `settings`:
  - `orderBufferMinutes` (Number, default: 20)
  - `autoRejectTimeoutMinutes` (Number, default: 15)
  - `currency` (String, default: "INR")
  - `allowPayAtRestaurant` (Boolean, default: true)
  - `minimumOrderAmount` (Number, default: 0)
  - `upiId` (String)
- `status`: `'PENDING_APPROVAL'` | `'ACTIVE'` | `'SUSPENDED'`
- `subscriptionId` (Ref: Subscription)

### 2. `users`
Accounts for SaaS Super Admins, Restaurant Owners, and Kitchen Staff.
- `tenantId` (String, Index, null for Super Admin)
- `name` (String)
- `email` (String, Unique, Index)
- `passwordHash` (String, Bcrypt 12 rounds)
- `role`: `'SUPER_ADMIN'` | `'RESTAURANT_OWNER'` | `'RESTAURANT_STAFF'`
- `permissions` (Array of Strings)
- `status`: `'ACTIVE'` | `'INACTIVE'`

### 3. `categories`
Organizes menu items within a restaurant.
- `tenantId` (String, Index)
- `name` (String)
- `displayOrder` (Number)
- `isActive` (Boolean)
- *Compound Index:* `{ tenantId: 1, displayOrder: 1 }`

### 4. `menuitems`
Individual dishes/items with pricing and availability.
- `tenantId` (String, Index)
- `categoryId` (Ref: Category, Index)
- `name` (String)
- `description` (String)
- `price` (Number, INR)
- `isVeg` (Boolean)
- `prepTimeEstimateMinutes` (Number)
- `isAvailable` (Boolean, for 86ing)
- `imageUrl` (String)
- *Compound Index:* `{ tenantId: 1, categoryId: 1, isAvailable: 1 }`

### 5. `orders`
Guest order requests with immutable historical snapshots.
- `orderReference` (String, Unique, Index)
- `tenantId` (String, Index)
- `customer`: `{ name, phone, specialInstructions }`
- `items`: `[{ menuItemId, nameSnapshot, priceSnapshot, quantity, subtotal }]`
- `pricing`: `{ subtotal, taxAmount, totalAmount }`
- `scheduling`: `{ expectedArrivalTime, estimatedReadyTime, actualReadyTime, acceptedAt, servedAt }`
- `status`: `'PENDING_CONFIRMATION'` | `'ACCEPTED'` | `'PREPARING'` | `'READY'` | `'SERVED'` | `'REJECTED'` | `'CANCELLED'` | `'EXPIRED'`
- `rejectionReason` (String)
- `payment`: `{ method: 'PAY_AT_RESTAURANT' | 'UPI_ON_ARRIVAL' | 'ONLINE', status: 'PENDING' | 'PAID' | 'REFUNDED' }`
- *Compound Index:* `{ tenantId: 1, status: 1, createdAt: -1 }`

### 6. `orderstatushistories`
Audit log of all lifecycle transitions.
- `orderId` (Ref: Order)
- `orderReference` (String)
- `tenantId` (String, Index)
- `previousStatus` (String)
- `newStatus` (String)
- `actor`: `{ userId, role, name }`
- `reason` (String)
- `createdAt` (Date)
