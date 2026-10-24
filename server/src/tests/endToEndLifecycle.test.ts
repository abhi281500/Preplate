import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';

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

describe('Phase 7: Comprehensive End-to-End SaaS Platform Lifecycle Verification', () => {
  let superAdminToken: string;
  let newOwnerToken: string;
  let newTenantSlug = 'grand-express-hub';
  let categoryId: string;
  let availableItemId: string;
  let soldOutItemId: string;
  let placedOrderRef: string;
  let placedOrderId: string;

  // Step 1: Super Admin sets up SaaS platform & plans
  it('Step 1: Super Admin logs in and configures a dynamic subscription plan', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@preplate.io',
      password: 'Admin@Preplate2026!'
    });
    expect(loginRes.status).toBe(200);
    superAdminToken = loginRes.body.data.token;

    const planRes = await request(app)
      .post('/api/v1/super/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        planKey: 'HIGHWAY_PREMIUM',
        name: 'Highway Premium Tier',
        description: 'For high-volume express highway stop diners.',
        priceINR: 1499,
        billingCycle: 'MONTHLY',
        features: {
          maxMenuItems: 150,
          maxStaffAccounts: 10,
          analyticsAccess: true,
          prioritySupport: true
        },
        isActive: true
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.data.plan.planKey).toBe('HIGHWAY_PREMIUM');
    expect(planRes.body.data.plan.priceINR).toBe(1499);
  });

  // Step 2: New Restaurant Onboarding
  it('Step 2: A new restaurant registers on Preplate', async () => {
    const regRes = await request(app).post('/api/v1/auth/register-restaurant').send({
      restaurantName: 'Grand Express Hub',
      slug: newTenantSlug,
      ownerName: 'Vikas Malhotra',
      email: 'vikas@grandexpress.com',
      password: 'VikasSecure2026!',
      contactPhone: '+919811223344',
      whatsappNumber: '+919811223344'
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.token).toBeDefined();
    expect(regRes.body.data.restaurant.slug).toBe(newTenantSlug);

    newOwnerToken = regRes.body.data.token;
  });

  // Step 3: Restaurant Owner configures menu categories and food items
  it('Step 3: Restaurant owner sets up categories and menu items', async () => {
    // 1. Create Category
    const catRes = await request(app)
      .post('/api/v1/restaurant/categories')
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({
        name: 'Tandoori Delights',
        description: 'Fresh clay oven breads and curries',
        sortOrder: 1
      });

    expect(catRes.status).toBe(201);
    categoryId = catRes.body.data._id;

    // 2. Create Available Menu Item
    const item1Res = await request(app)
      .post('/api/v1/restaurant/menu-items')
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({
        categoryId,
        name: 'Amritsari Stuffed Kulcha',
        description: 'Crisp tandoori bread filled with spiced potatoes',
        price: 150,
        isVeg: true,
        preparationTimeMinutes: 15,
        isAvailable: true
      });

    expect(item1Res.status).toBe(201);
    availableItemId = item1Res.body.data._id;

    // 3. Create Sold-Out Menu Item
    const item2Res = await request(app)
      .post('/api/v1/restaurant/menu-items')
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({
        categoryId,
        name: 'Special Maharaja Thali',
        description: 'Grand royal assortment with paneer, dal makhani, and sweets',
        price: 350,
        isVeg: true,
        preparationTimeMinutes: 25,
        isAvailable: false
      });

    expect(item2Res.status).toBe(201);
    soldOutItemId = item2Res.body.data._id;
  });

  // Step 4: 86ing Inventory Validation (Rejecting sold-out items)
  it('Step 4: Customer order containing sold-out item is rejected by server with clear reason', async () => {
    const arrivalTime = new Date(Date.now() + 60 * 60 * 1000);
    // Ensure arrival is in operating hours (10:00 - 22:00)
    if (arrivalTime.getHours() < 11 || arrivalTime.getHours() > 20) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
      arrivalTime.setHours(13, 0, 0, 0);
    }

    const res = await request(app)
      .post(`/api/v1/public/restaurants/${newTenantSlug}/orders`)
      .send({
        customer: { name: 'Sunil Kumar', phone: '+919876540000' },
        items: [{ menuItemId: soldOutItemId, quantity: 1 }],
        expectedArrivalTime: arrivalTime.toISOString(),
        paymentMethod: 'PAY_AT_RESTAURANT'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('sold out');
  });

  // Step 5: Guest Customer places valid pre-arrival order with server pricing calculation
  it('Step 5: Customer successfully places order with server-verified prices & GST snapshot', async () => {
    const arrivalTime = new Date(Date.now() + 60 * 60 * 1000);
    if (arrivalTime.getHours() < 11 || arrivalTime.getHours() > 20) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
      arrivalTime.setHours(14, 0, 0, 0);
    }

    const res = await request(app)
      .post(`/api/v1/public/restaurants/${newTenantSlug}/orders`)
      .send({
        customer: {
          name: 'Sunil Kumar',
          phone: '+919876540000',
          specialInstructions: 'Make kulcha extra crisp please'
        },
        items: [{ menuItemId: availableItemId, quantity: 2 }], // 2 x 150 = 300
        expectedArrivalTime: arrivalTime.toISOString(),
        paymentMethod: 'PAY_AT_RESTAURANT'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderReference).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    expect(res.body.data.status).toBe('PENDING_CONFIRMATION');

    // Server-side calculation verification
    expect(res.body.data.pricing.subtotal).toBe(300);
    expect(res.body.data.pricing.taxAmount).toBe(15); // 5% of 300
    expect(res.body.data.pricing.totalAmount).toBe(315);

    // Immutable snapshot verification
    expect(res.body.data.items[0].nameSnapshot).toBe('Amritsari Stuffed Kulcha');
    expect(res.body.data.items[0].priceSnapshot).toBe(150);

    placedOrderRef = res.body.data.orderReference;
    placedOrderId = res.body.data.id.toString();
  });

  // Step 6: Customer can track order status
  it('Step 6: Customer checks live order status via public tracking endpoint', async () => {
    const res = await request(app).get(
      `/api/v1/public/restaurants/${newTenantSlug}/orders/${placedOrderRef}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.orderReference).toBe(placedOrderRef);
    expect(res.body.data.status).toBe('PENDING_CONFIRMATION');
    expect(res.body.data.restaurant.name).toBe('Grand Express Hub');
  });

  // Step 7: Restaurant Owner accepts the order with 20-minute estimated preparation time
  it('Step 7: Restaurant owner reviews order in queue and accepts it with prep duration estimate', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurant/orders/${placedOrderId}/accept`)
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({
        prepDurationMinutes: 20
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACCEPTED');
    expect(res.body.data.scheduling.estimatedReadyTime).toBeDefined();
  });

  // Step 8: Kitchen Display System (KDS) progression: PREPARING -> READY
  it('Step 8: Kitchen marks order as PREPARING, then READY', async () => {
    // 1. Transition to PREPARING
    const prepRes = await request(app)
      .post(`/api/v1/restaurant/orders/${placedOrderId}/status`)
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({ nextStatus: 'PREPARING' });

    expect(prepRes.status).toBe(200);
    expect(prepRes.body.data.status).toBe('PREPARING');

    // 2. Transition to READY
    const readyRes = await request(app)
      .post(`/api/v1/restaurant/orders/${placedOrderId}/status`)
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({ nextStatus: 'READY' });

    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.status).toBe('READY');

    // 3. Verify Customer tracking sees READY
    const trackRes = await request(app).get(
      `/api/v1/public/restaurants/${newTenantSlug}/orders/${placedOrderRef}`
    );
    expect(trackRes.body.data.status).toBe('READY');
  });

  // Step 9: Staff marks order as SERVED
  it('Step 9: Staff serves food to customer upon arrival', async () => {
    const serveRes = await request(app)
      .post(`/api/v1/restaurant/orders/${placedOrderId}/status`)
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .send({ nextStatus: 'SERVED' });

    expect(serveRes.status).toBe(200);
    expect(serveRes.body.data.status).toBe('SERVED');
  });

  // Step 10: Restaurant Operational Analytics reflects completed order
  it('Step 10: Restaurant analytics reflects 100% acceptance rate and earned revenue', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/analytics/summary')
      .set('Authorization', `Bearer ${newOwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalOrders).toBe(1);
    expect(res.body.data.servedOrders).toBe(1);
    expect(res.body.data.totalServedRevenue).toBe(315);
    expect(res.body.data.acceptanceRate).toBe(100);
  });

  // Step 11: Multi-Tenant Isolation Strict Enforcement
  it('Step 11: Cross-tenant spoofing attempt is rejected with 403 Forbidden', async () => {
    // Owner of Grand Express Hub tries to query Highway Dhaba Express tenant data
    const res = await request(app)
      .get('/api/v1/restaurant/orders')
      .set('Authorization', `Bearer ${newOwnerToken}`)
      .set('x-tenant-id', 'tenant_highway_dhaba_001');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cross-tenant access violation');
  });

  // Step 12: Super Admin Platform Control Plane aggregates platform GMV
  it('Step 12: Super Admin views platform overview showing aggregated GMV from all tenants', async () => {
    const res = await request(app)
      .get('/api/v1/super/analytics/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.totalRestaurants).toBeGreaterThanOrEqual(3); // 2 seeded + 1 onboarded
    expect(res.body.data.metrics.totalGMV).toBeGreaterThanOrEqual(315);
    expect(res.body.data.ordersByStatus.SERVED).toBeGreaterThanOrEqual(1);
  });
});
