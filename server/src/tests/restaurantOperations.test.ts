import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';

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

describe('Phase 4: Restaurant Operations, KDS & State Machine Tests', () => {
  let rest1OwnerToken: string;
  let rest1StaffToken: string;
  let rest2OwnerToken: string;
  let testOrderId: string;
  let secondOrderId: string;

  beforeAll(async () => {
    // 1. Owner 1 (Highway Dhaba)
    const res1 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@highwaydhaba.com',
      password: 'DhabaOwner@123'
    });
    rest1OwnerToken = res1.body.data.token;

    // 2. Kitchen Staff 1 (Highway Dhaba)
    const resStaff = await request(app).post('/api/v1/auth/login').send({
      email: 'kitchen@highwaydhaba.com',
      password: 'KitchenStaff@123'
    });
    rest1StaffToken = resStaff.body.data.token;

    // 3. Owner 2 (Urban Spice)
    const res2 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@urbanspice.com',
      password: 'UrbanOwner@123'
    });
    rest2OwnerToken = res2.body.data.token;

    // Fetch an item from Highway Dhaba to place test orders
    const item = await MenuItem.findOne({ tenantId: 'tenant_highway_dhaba_001' });

    // Place Order 1
    const targetTime = new Date(Date.now() + 45 * 60 * 1000);
    if (targetTime.getHours() < 11 || targetTime.getHours() > 21) {
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(14, 0, 0, 0);
    }

    const orderRes1 = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'KDS Diner 1', phone: '9876543210' },
        items: [{ menuItemId: item!._id.toString(), quantity: 2 }],
        expectedArrivalTime: targetTime.toISOString()
      });

    const dbOrder1 = await Order.findOne({ orderReference: orderRes1.body.data.orderReference });
    testOrderId = dbOrder1!._id.toString();

    // Place Order 2 (for reject test)
    const orderRes2 = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'KDS Diner 2', phone: '9876543211' },
        items: [{ menuItemId: item!._id.toString(), quantity: 1 }],
        expectedArrivalTime: targetTime.toISOString()
      });

    const dbOrder2 = await Order.findOne({ orderReference: orderRes2.body.data.orderReference });
    secondOrderId = dbOrder2!._id.toString();
  });

  it('allows restaurant staff to fetch the active orders queue and queue summaries', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/orders')
      .set('Authorization', `Bearer ${rest1StaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.queueSummary).toBeDefined();
    expect(res.body.data.queueSummary.pendingCount).toBeGreaterThanOrEqual(2);
  });

  it('allows kitchen staff to accept a pending order and specify preparation time', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/accept`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ prepDurationMinutes: 25 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACCEPTED');
    expect(res.body.data.scheduling.acceptedAt).toBeDefined();
    expect(res.body.data.scheduling.estimatedReadyTime).toBeDefined();
  });

  it('allows restaurant staff to reject a pending order with a clear reason', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${secondOrderId}/reject`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ reason: 'Kitchen at full capacity during lunch rush' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.rejectionReason).toBe('Kitchen at full capacity during lunch rush');
  });

  it('allows kitchen staff to advance accepted order to PREPARING status', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ nextStatus: 'PREPARING' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PREPARING');
  });

  it('allows kitchen staff to mark preparing order as READY with actualReadyTime recorded', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ nextStatus: 'READY' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('READY');
    expect(res.body.data.scheduling.actualReadyTime).toBeDefined();
  });

  it('allows staff to mark ready order as SERVED and marks pay-at-counter as PAID', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ nextStatus: 'SERVED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SERVED');
    expect(res.body.data.scheduling.servedAt).toBeDefined();
    expect(res.body.data.payment.status).toBe('PAID');
  });

  it('blocks illegal status transitions with 400 Bad Request', async () => {
    // Attempting to advance a SERVED order (terminal state) to PREPARING
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ nextStatus: 'PREPARING' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid status transition');
  });

  it('blocks Restaurant 2 from accepting or modifying Restaurant 1 order (cross-tenant safety)', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${rest2OwnerToken}`) // Urban Spice Owner
      .send({ nextStatus: 'READY' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns operational analytics summary for the restaurant', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/analytics/summary')
      .set('Authorization', `Bearer ${rest1OwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalOrders).toBeGreaterThanOrEqual(2);
    expect(res.body.data.servedOrders).toBeGreaterThanOrEqual(1);
    expect(res.body.data.rejectedOrders).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalServedRevenue).toBeGreaterThan(0);
    expect(res.body.data.acceptanceRate).toBeDefined();
  });
});
