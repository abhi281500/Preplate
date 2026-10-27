# Preplate — UI/UX Design System & Storefront Guidelines

**Version:** 1.0.0-PROD  
**Design Philosophy:** Mobile-First, Touch-Optimized, High-Contrast Dining SaaS  

---

## 1. Design Tokens & Color Palette

Preplate uses Tailwind CSS configured with custom brand and utility colors:

| Token Name | Hex Code | Tailwind Utility | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `#EA580C` | `brand-600` | Primary actions, checkout buttons, active badges |
| **Brand Hover** | `#C2410C` | `brand-700` | Button hover and pressed active states |
| **Brand Accent** | `#F59E0B` | `amber-500` | Warning alerts, demo sandbox banners, highlights |
| **Success / Veg** | `#16A34A` | `emerald-600` | Vegetarian food badge, verified OTP indicator, accepted |
| **Danger / Non-Veg**| `#DC2626` | `red-600` | Non-veg food badge, sold-out tags, rejection alerts |
| **Neutral Canvas** | `#FAFAF9` | `stone-50` | Page background, card groupings |
| **Card Surface** | `#FFFFFF` | `white` | Interactive food cards, modals, checkout drawer |
| **Deep Typography** | `#1C1917` | `stone-900` | High-contrast headers, prices, and line-item titles |

---

## 2. Responsive Breakpoint Guidelines

- **Mobile Viewports (< 640px):**
  - Sticky bottom cart bar showing item count, total price, and "View Cart" action.
  - Full-width slide-over Cart Drawer (`w-full max-w-md`).
  - Minimum touch targets of 44x44px for quantity increment/decrement buttons (`Plus`, `Minus`).
  - No horizontal scrolling; cards wrap naturally using `flex-wrap` and CSS grid.
- **Tablet & Desktop Viewports (>= 768px):**
  - Side-by-side category sidebar navigation.
  - Multi-column food item grids (2 or 3 columns).
  - Floating order summary and quick navigation back to top.

---

## 3. Persistent Cart & State Management Rules

1. **Survival Across Refreshes:** Cart items must survive accidental browser refresh, tab close, or navigating back to directory. State synchronizes to `localStorage` under `preplate_active_cart`.
2. **Clear Confirmation:** Emptying cart requires intentional removal of items or explicit order placement completion.
3. **Availability Warnings:** If an item is limited in portion count, incrementing past `maxAvailable` produces an inline alert and clamps quantity.

---

## 4. Kitchen Display System (KDS) Touch Optimization

- Large, high-visibility status buttons for kitchen staff wearing gloves.
- Audible chime notifications for incoming orders.
- Color-coded urgency cards based on expected diner arrival time (amber for < 15 mins, green for > 30 mins).
