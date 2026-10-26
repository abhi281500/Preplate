import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { MenuItem } from '../models/MenuItem.js';
import { Restaurant } from '../models/Restaurant.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await runSeed(true);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 3: Ordering Engine, Pricing & State Machine Tests', () => {
  let dalMakhaniId: string;
  let butterNaanId: string;
  let paneerTikkaId: string;
  let createdOrderRef: string;

  beforeAll(async () => {
    const items = await MenuItem.find({ tenantId: 'tenant_highway_dhaba_001' });
    const dal = items.find((i) => i.name.includes('Dal Makhani'))!;
    const naan = items.find((i) => i.name.includes('Butter Naan'))!;
    const paneer = items.find((i) => i.name.includes('Paneer Tikka'))!;

    dalMakhaniId = dal._id.toString();
    butterNaanId = naan._id.toString();
    paneerTikkaId = paneer._id.toString();
  });

  // Helper function to build a valid arrival time during open hours (e.g., today at 14:00 or tomorrow at 14:00)
  function getValidArrivalTime(minutesInAdvance = 45): string {
    const target = new Date(Date.now() + minutesInAdvance * 60 * 1000);
    // If target hour is outside 11:00 - 21:00, set to tomorrow at 14:00
    const hour = target.getHours();
    if (hour < 11 || hour > 21) {
      target.setDate(target.getDate() + 1);
      target.setHours(14, 0, 0, 0);
    }
    return target.toISOString();
  }

  it('should successfully place an order request with server-calculated pricing and PENDING_CONFIRMATION status', async () => {
    const arrivalTime = getValidArrivalTime(45);

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: {
          name: 'Vikram Batra',
          phone: '+919876543210',
          specialInstructions: 'Make dal extra buttery'
        },
        items: [
          { menuItemId: dalMakhaniId, quantity: 1 }, // ₹220
          { menuItemId: butterNaanId, quantity: 2 }   // ₹45 * 2 = ₹90
        ],
        expectedArrivalTime: arrivalTime,
        paymentMethod: 'PAY_AT_RESTAURANT'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderReference).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    expect(res.body.data.status).toBe('PENDING_CONFIRMATION');

    // Verify Server-Side Price Calculation:
    // Subtotal: 220 + 90 = 310
    // Tax (5%): Math.round(310 * 0.05) = 16
    // Total: 326
    expect(res.body.data.pricing.subtotal).toBe(310);
    expect(res.body.data.pricing.taxAmount).toBe(16);
    expect(res.body.data.pricing.totalAmount).toBe(326);

    // Verify WhatsApp deep link was generated
    expect(res.body.data.whatsAppLink).toContain('https://wa.me/');
    expect(res.body.data.whatsAppLink).toContain('ORD-');

    // Verify correlation ID header is attached
    expect(res.headers['x-request-id']).toBeDefined();

    createdOrderRef = res.body.data.orderReference;

    // Verify Payment document was created in the separate Payment collection
    const payment = await Payment.findOne({ orderReference: createdOrderRef });
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(326);
    expect(payment?.status).toBe('PENDING');
    expect(payment?.method).toBe('PAY_AT_RESTAURANT');
  });

  it('should preserve immutable item snapshots even if the menu price is later modified', async () => {
    // 1. Temporarily change Dal Makhani price in DB from 220 to 500
    await MenuItem.updateOne({ _id: dalMakhaniId }, { price: 500 });

    // 2. Query the previously created order
    const res = await request(app).get(
      `/api/v1/public/restaurants/highway-dhaba/orders/${createdOrderRef}`
    );

    expect(res.status).toBe(200);
    const dalItem = res.body.data.items.find((i: any) => i.nameSnapshot.includes('Dal Makhani'));
    // The snapshot MUST still be 220, NOT the new 500
    expect(dalItem.priceSnapshot).toBe(220);
    expect(dalItem.subtotal).toBe(220);
    expect(res.body.data.pricing.subtotal).toBe(310);

    // Revert price back to 220
    await MenuItem.updateOne({ _id: dalMakhaniId }, { price: 220 });
  });

  it('should reject order if expected arrival time is in the past', async () => {
    const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'Late Guest', phone: '9876543210' },
        items: [{ menuItemId: dalMakhaniId, quantity: 1 }],
        expectedArrivalTime: pastTime
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('future');
  });

  it('should reject order if arrival time violates minimum preparation buffer', async () => {
    // Highway Dhaba has orderBufferMinutes = 20. Try placing an order for only 5 minutes from now.
    const immediateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'Rushed Diner', phone: '9876543210' },
        items: [{ menuItemId: dalMakhaniId, quantity: 1 }],
        expectedArrivalTime: immediateTime
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('buffer');
  });

  it('should reject order if any requested item is sold out', async () => {
    // 1. Mark Paneer Tikka as sold out
    await MenuItem.updateOne({ _id: paneerTikkaId }, { isAvailable: false });

    const arrivalTime = getValidArrivalTime(45);

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'Hungry Diner', phone: '9876543210' },
        items: [
          { menuItemId: paneerTikkaId, quantity: 1 } // Sold out item
        ],
        expectedArrivalTime: arrivalTime
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('sold out');

    // Restore availability
    await MenuItem.updateOne({ _id: paneerTikkaId }, { isAvailable: true });
  });

  it('should reject order if minimum order amount is not met', async () => {
    // Highway Dhaba minimumOrderAmount is 100. Butter Naan is 45.
    const arrivalTime = getValidArrivalTime(45);

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'Small Order', phone: '9876543210' },
        items: [{ menuItemId: butterNaanId, quantity: 1 }], // Subtotal 45 < 100
        expectedArrivalTime: arrivalTime
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Minimum order amount');
  });

  it('should allow customer to track order status by orderReference with masked phone number', async () => {
    const res = await request(app).get(
      `/api/v1/public/restaurants/highway-dhaba/orders/${createdOrderRef}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderReference).toBe(createdOrderRef);
    expect(res.body.data.status).toBe('PENDING_CONFIRMATION');
    expect(res.body.data.customer.name).toBe('Vikram Batra');
    // Ensure customer phone is masked for public tracking
    expect(res.body.data.customer.phone).toBe('+91 98****3210');
    expect(res.body.data.whatsAppLink).toBeDefined();
  });

  it('should allow customer to cancel order while still in PENDING_CONFIRMATION status', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/highway-dhaba/orders/${createdOrderRef}/cancel`)
      .send({ reason: 'Trip plans changed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');

    // Verify in database
    const dbOrder = await Order.findOne({ orderReference: createdOrderRef });
    expect(dbOrder?.status).toBe('CANCELLED');
    expect(dbOrder?.cancellationReason).toBe('Trip plans changed');
  });

  it('should reject cancellation if order is already cancelled', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/highway-dhaba/orders/${createdOrderRef}/cancel`)
      .send({ reason: 'Cancel again' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('CANCELLED');
  });

  it('should support Idempotency-Key to prevent duplicate order creation on network retries', async () => {
    const arrivalTime = getValidArrivalTime(50);
    const testIdempotencyKey = 'idemp-test-uuid-9999';

    const orderPayload = {
      customer: {
        name: 'Idempotent Customer',
        phone: '+919999888877'
      },
      items: [
        { menuItemId: dalMakhaniId, quantity: 1 }
      ],
      expectedArrivalTime: arrivalTime,
      paymentMethod: 'PAY_AT_RESTAURANT'
    };

    // First attempt
    const res1 = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .set('Idempotency-Key', testIdempotencyKey)
      .send(orderPayload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    const firstOrderRef = res1.body.data.orderReference;

    // Second attempt with identical idempotency key
    const res2 = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .set('Idempotency-Key', testIdempotencyKey)
      .send(orderPayload);

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    // Must return identical cached order reference without creating a second record
    expect(res2.body.data.orderReference).toBe(firstOrderRef);

    // Verify only 1 order exists for this phone number
    const matchingOrders = await Order.find({ 'customer.phone': '+919999888877' });
    expect(matchingOrders.length).toBe(1);
  });
});
