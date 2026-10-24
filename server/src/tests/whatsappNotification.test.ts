import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { MenuItem } from '../models/MenuItem.js';
import { NotificationLog } from '../models/NotificationLog.js';

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

describe('Phase 5: WhatsApp Integration, Deep Links & Notification Logging Tests', () => {
  let rest1OwnerToken: string;
  let rest2OwnerToken: string;
  let sampleOrderRef: string;
  let sampleOrderId: string;

  beforeAll(async () => {
    // 1. Login Highway Dhaba Owner
    const res1 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@highwaydhaba.com',
      password: 'DhabaOwner@123'
    });
    rest1OwnerToken = res1.body.data.token;

    // 2. Login Urban Spice Owner
    const res2 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@urbanspice.com',
      password: 'UrbanOwner@123'
    });
    rest2OwnerToken = res2.body.data.token;

    // 3. Place an order to trigger notification logging
    const item = await MenuItem.findOne({ tenantId: 'tenant_highway_dhaba_001' });

    const targetTime = new Date(Date.now() + 45 * 60 * 1000);
    if (targetTime.getHours() < 11 || targetTime.getHours() > 21) {
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(14, 0, 0, 0);
    }

    const orderRes = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: { name: 'WhatsApp Tester', phone: '+919988776655' },
        items: [{ menuItemId: item!._id.toString(), quantity: 1 }],
        expectedArrivalTime: targetTime.toISOString()
      });

    sampleOrderRef = orderRes.body.data.orderReference;
  });

  it('automatically logs a NotificationLog entry when an order request is placed', async () => {
    const log = await NotificationLog.findOne({
      orderReference: sampleOrderRef,
      purpose: 'ORDER_SUBMITTED_REQUEST'
    });

    expect(log).not.toBeNull();
    expect(log?.channel).toBe('WHATSAPP_CLICK_TO_CHAT');
    expect(log?.deliveryState).toBe('PREFILLED_LINK_GENERATED');
    expect(log?.recipientRole).toBe('RESTAURANT');
    expect(log?.tenantId).toBe('tenant_highway_dhaba_001');
    expect(log?.messagePayload).toContain(sampleOrderRef);

    sampleOrderId = log?.orderId?.toString() || '';
  });

  it('automatically logs an alert notification when the restaurant accepts the order', async () => {
    // Accept the order
    await request(app)
      .post(`/api/v1/restaurant/orders/${sampleOrderId}/accept`)
      .set('Authorization', `Bearer ${rest1OwnerToken}`)
      .send({ prepDurationMinutes: 20 });

    const log = await NotificationLog.findOne({
      orderReference: sampleOrderRef,
      purpose: 'ORDER_ACCEPTED_ALERT'
    });

    expect(log).not.toBeNull();
    expect(log?.recipientRole).toBe('CUSTOMER');
    expect(log?.recipientPhone).toBe('+919988776655');
    expect(log?.messagePayload).toContain('accepted');
  });

  it('automatically logs an alert notification when the order is marked READY', async () => {
    // Advance to PREPARING then READY
    await request(app)
      .post(`/api/v1/restaurant/orders/${sampleOrderId}/status`)
      .set('Authorization', `Bearer ${rest1OwnerToken}`)
      .send({ nextStatus: 'PREPARING' });

    await request(app)
      .post(`/api/v1/restaurant/orders/${sampleOrderId}/status`)
      .set('Authorization', `Bearer ${rest1OwnerToken}`)
      .send({ nextStatus: 'READY' });

    const log = await NotificationLog.findOne({
      orderReference: sampleOrderRef,
      purpose: 'ORDER_READY_ALERT'
    });

    expect(log).not.toBeNull();
    expect(log?.recipientRole).toBe('CUSTOMER');
    expect(log?.messagePayload).toContain('ready');
  });

  it('allows restaurant owner to fetch their notification logs and delivery summaries', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/notifications')
      .set('Authorization', `Bearer ${rest1OwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.summary.totalLogged).toBeGreaterThanOrEqual(3);
    expect(res.body.data.summary.clickToChatCount).toBeGreaterThanOrEqual(3);
  });

  it('allows restaurant owner to view WhatsApp settings and mode descriptions', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/notifications/settings')
      .set('Authorization', `Bearer ${rest1OwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.whatsappNumber).toBe('+919876543210');
    expect(res.body.data.channelFeatures.clickToChat.available).toBe(true);
    expect(res.body.data.channelFeatures.clickToChat.status).toBe('ACTIVE_DEFAULT');
  });

  it('allows restaurant owner to update WhatsApp notification number', async () => {
    const res = await request(app)
      .put('/api/v1/restaurant/notifications/settings')
      .set('Authorization', `Bearer ${rest1OwnerToken}`)
      .send({ whatsappNumber: '+919876500000' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.whatsappNumber).toBe('+919876500000');

    // Restore original
    await request(app)
      .put('/api/v1/restaurant/notifications/settings')
      .set('Authorization', `Bearer ${rest1OwnerToken}`)
      .send({ whatsappNumber: '+919876543210' });
  });

  it('handles Meta Webhook verification handshake with hub.verify_token and hub.challenge', async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_webhook_token';

    const res = await request(app)
      .get('/api/v1/webhook/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_webhook_token',
        'hub.challenge': 'CHALLENGE_CODE_12345'
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe('CHALLENGE_CODE_12345');
  });

  it('rejects invalid Meta Webhook verification token with 403', async () => {
    const res = await request(app)
      .get('/api/v1/webhook/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'CHALLENGE_CODE_12345'
      });

    expect(res.status).toBe(403);
  });

  it('processes incoming Meta delivery status updates and updates NotificationLog status', async () => {
    // 1. Create a dummy log with a providerMessageId
    const testLog = await NotificationLog.create({
      tenantId: 'tenant_highway_dhaba_001',
      orderReference: 'ORD-TEST-META',
      recipientPhone: '+919876543210',
      recipientRole: 'CUSTOMER',
      channel: 'WHATSAPP_CLOUD_API',
      purpose: 'ORDER_ACCEPTED_ALERT',
      deliveryState: 'DISPATCHED',
      providerMessageId: 'wamid.HBgLM...TEST_1234',
      messagePayload: 'Test payload'
    });

    // 2. Post webhook event from Meta signifying message was 'delivered'
    const res = await request(app)
      .post('/api/v1/webhook/whatsapp')
      .send({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234567890', phone_number_id: '12345' },
                  statuses: [
                    {
                      id: 'wamid.HBgLM...TEST_1234',
                      status: 'delivered',
                      timestamp: '1690000000',
                      recipient_id: '919876543210'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      });

    expect(res.status).toBe(200);

    // 3. Verify in database that deliveryState transitioned to DELIVERED
    const updatedLog = await NotificationLog.findById(testLog._id);
    expect(updatedLog?.deliveryState).toBe('DELIVERED');
  });

  it('guarantees cross-tenant isolation on notification logs', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/notifications')
      .set('Authorization', `Bearer ${rest2OwnerToken}`); // Urban Spice

    expect(res.status).toBe(200);
    // Should NOT contain any Highway Dhaba logs
    const hasHighwayLog = res.body.data.logs.some(
      (l: any) => l.tenantId === 'tenant_highway_dhaba_001'
    );
    expect(hasHighwayLog).toBe(false);
  });
});
