import crypto from 'crypto';
import { IOrder } from '../../models/Order.js';

export function generateOrderReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars

  return `ORD-${year}${month}${day}-${randomSuffix}`;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '****';
  const trimmed = phone.trim();
  if (/^\d{10}$/.test(trimmed)) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith('+')) {
    const countryCodeAndDigits = trimmed.replace(/[^\d+]/g, '');
    if (countryCodeAndDigits.length >= 10) {
      const countryCode = countryCodeAndDigits.slice(0, countryCodeAndDigits.length - 10);
      const rest = countryCodeAndDigits.slice(-10);
      return `${countryCode} ${rest.slice(0, 2)}****${rest.slice(-4)}`;
    }
  }
  if (trimmed.length > 4) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return '****';
}

export function buildWhatsAppLink(
  restaurantWhatsApp: string,
  restaurantName: string,
  order: IOrder,
  clientOrigin: string
): string {
  const cleanNumber = restaurantWhatsApp.replace(/[^0-9]/g, '');

  const itemsList = order.items
    .map((item) => `• ${item.quantity}x ${item.nameSnapshot} (₹${item.subtotal})`)
    .join('\n');

  const arrivalTimeFormatted = new Date(order.scheduling.expectedArrivalTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const trackingUrl = `${clientOrigin}/r/${order.tenantId}/order/${order.orderReference}`;

  const message = [
    `🍽️ *PREPLATE ORDER REQUEST*`,
    `Ref: #${order.orderReference}`,
    `Restaurant: ${restaurantName}`,
    `Customer: ${order.customer.name} (${order.customer.phone})`,
    `Expected Arrival: ${arrivalTimeFormatted}`,
    `--------------------------`,
    itemsList,
    `--------------------------`,
    `Subtotal: ₹${order.pricing.subtotal}`,
    `Taxes (GST 5%): ₹${order.pricing.taxAmount}`,
    `Total: ₹${order.pricing.totalAmount} (${order.payment.method.replace(/_/g, ' ')})`,
    order.customer.specialInstructions ? `Special Notes: "${order.customer.specialInstructions}"` : null,
    `--------------------------`,
    `Track Live Status:`,
    trackingUrl
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
