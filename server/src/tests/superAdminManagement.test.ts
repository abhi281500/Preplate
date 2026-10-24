import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { Restaurant } from '../models/Restaurant.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { AuditLog } from '../models/AuditLog.js';

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

describe('Phase 6: Multi-Tenant SaaS Management & Super Admin Tests', () => {
  let superAdminToken: string;
  let restaurantOwnerToken: string;
  let testRestaurantId: string;
  let createdPlanId: string;

  beforeAll(async () => {
    // 1. Login Super Admin
    const superRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@preplate.io',
      password: 'Admin@Preplate2026!'
    });
    superAdminToken = superRes.body.data.token;

    // 2. Login Regular Restaurant Owner
    const ownerRes = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@highwaydhaba.com',
      password: 'DhabaOwner@123'
    });
    restaurantOwnerToken = ownerRes.body.data.token;

    // 3. Find Highway Dhaba Restaurant ID
    const dhaba = await Restaurant.findOne({ tenantId: 'tenant_highway_dhaba_001' });
    testRestaurantId = dhaba!._id.toString();
  });

  it('1. should reject unauthenticated requests to /api/v1/super/* with 401', async () => {
    const res = await request(app).get('/api/v1/super/analytics/overview');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. should reject regular restaurant owner with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/super/analytics/overview')
      .set('Authorization', `Bearer ${restaurantOwnerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });

  it('3. should allow Platform Super Admin to retrieve platform overview & GMV analytics', async () => {
    const res = await request(app)
      .get('/api/v1/super/analytics/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalRestaurants).toBeGreaterThanOrEqual(2);
    expect(res.body.data.metrics.activeRestaurants).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.metrics.totalGMV).toBe('number');
    expect(res.body.data.ordersByStatus).toBeDefined();
  });

  it('4. should allow Super Admin to list all registered tenant restaurants with owner and stats', async () => {
    const res = await request(app)
      .get('/api/v1/super/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.restaurants)).toBe(true);
    expect(res.body.data.restaurants.length).toBeGreaterThanOrEqual(2);

    const highwayDhaba = res.body.data.restaurants.find(
      (r: any) => r.tenantId === 'tenant_highway_dhaba_001'
    );
    expect(highwayDhaba).toBeDefined();
    expect(highwayDhaba.name).toBe('Highway Dhaba Express');
    expect(highwayDhaba.owner).toBeDefined();
    expect(highwayDhaba.owner.email).toBe('owner@highwaydhaba.com');
  });

  it('5. should allow Super Admin to get full details of a specific restaurant', async () => {
    const res = await request(app)
      .get(`/api/v1/super/restaurants/${testRestaurantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurant.name).toBe('Highway Dhaba Express');
    expect(res.body.data.owner.email).toBe('owner@highwaydhaba.com');
    expect(res.body.data.stats).toBeDefined();
  });

  it('6. should allow Super Admin to suspend a restaurant tenant and create an audit log', async () => {
    const res = await request(app)
      .patch(`/api/v1/super/restaurants/${testRestaurantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'SUSPENDED',
        reason: 'Payment delinquency audit hold'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUSPENDED');

    // Verify DB update
    const updated = await Restaurant.findById(testRestaurantId);
    expect(updated?.status).toBe('SUSPENDED');

    // Verify AuditLog was recorded
    const audit = await AuditLog.findOne({
      tenantId: 'tenant_highway_dhaba_001',
      action: 'UPDATE_RESTAURANT_STATUS'
    });
    expect(audit).toBeDefined();
    expect((audit?.details as any)?.newStatus).toBe('SUSPENDED');
  });

  it('7. should immediately reject suspended restaurant owner from operating endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/profile')
      .set('Authorization', `Bearer ${restaurantOwnerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('suspended');
  });

  it('8. should allow Super Admin to reactivate the suspended restaurant tenant', async () => {
    const res = await request(app)
      .patch(`/api/v1/super/restaurants/${testRestaurantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'Account reinstated following review'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');

    // Verify owner can now access profile again
    const ownerRes = await request(app)
      .get('/api/v1/restaurant/profile')
      .set('Authorization', `Bearer ${restaurantOwnerToken}`);

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.name).toBe('Highway Dhaba Express');
  });

  it('9. should allow Super Admin to create a new configurable subscription plan', async () => {
    const res = await request(app)
      .post('/api/v1/super/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        planKey: 'ENTERPRISE_CUSTOM',
        name: 'Enterprise Highway Chain',
        description: 'Multi-outlet plan with high order throughput and priority support.',
        priceINR: 2499,
        billingCycle: 'MONTHLY',
        features: {
          maxMenuItems: 300,
          maxStaffAccounts: 20,
          analyticsAccess: true,
          prioritySupport: true
        },
        isActive: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.planKey).toBe('ENTERPRISE_CUSTOM');
    expect(res.body.data.plan.priceINR).toBe(2499);
    createdPlanId = res.body.data.plan._id;
  });

  it('10. should allow Super Admin to update an existing subscription plan', async () => {
    const res = await request(app)
      .put(`/api/v1/super/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        priceINR: 2999,
        description: 'Updated enterprise price with priority SLAs.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.priceINR).toBe(2999);
  });

  it('11. should allow Super Admin to assign a subscription plan to a tenant', async () => {
    const res = await request(app)
      .patch(`/api/v1/super/restaurants/${testRestaurantId}/plan`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        planId: createdPlanId,
        status: 'ACTIVE'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription).toBeDefined();
  });

  it('12. should allow Super Admin to query administrative audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/super/audit-logs?limit=10')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
  });
});
