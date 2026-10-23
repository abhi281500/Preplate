import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express, { Response } from 'express';
import { createApp } from '../app.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantContext.js';
import { AuthenticatedRequest } from '../types/index.js';
import { runSeed } from '../scripts/seed.js';
import { Restaurant } from '../models/Restaurant.js';

let mongoServer: MongoMemoryServer;

// Add a test endpoint protected by requireAuth and enforceTenantContext
const testRouter = express.Router();
testRouter.get(
  '/tenant-data',
  requireAuth,
  enforceTenantContext,
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Access granted to tenant workspace',
      tenantId: req.tenantId,
      userRole: req.user?.role
    });
  }
);

const app = createApp([{ path: '/test', router: testRouter }]);

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

describe('Cross-Tenant Isolation & Enforcement Tests', () => {
  let tenant1Token: string;
  let tenant2Token: string;
  let superAdminToken: string;

  beforeAll(async () => {
    // 1. Login Restaurant 1 (Highway Dhaba)
    const res1 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@highwaydhaba.com',
      password: 'DhabaOwner@123'
    });
    tenant1Token = res1.body.data.token;

    // 2. Login Restaurant 2 (Urban Spice)
    const res2 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@urbanspice.com',
      password: 'UrbanOwner@123'
    });
    tenant2Token = res2.body.data.token;

    // 3. Login Super Admin
    const resAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@preplate.io',
      password: 'Admin@Preplate2026!'
    });
    superAdminToken = resAdmin.body.data.token;
  });

  it('allows Restaurant 1 owner to access their own tenant context', async () => {
    const res = await request(app)
      .get('/api/v1/test/tenant-data')
      .set('Authorization', `Bearer ${tenant1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenantId).toBe('tenant_highway_dhaba_001');
  });

  it('allows Restaurant 2 owner to access their own tenant context', async () => {
    const res = await request(app)
      .get('/api/v1/test/tenant-data')
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenantId).toBe('tenant_urban_spice_002');
  });

  it('blocks Restaurant 1 from accessing Restaurant 2 data via spoofed x-tenant-id header', async () => {
    const res = await request(app)
      .get('/api/v1/test/tenant-data')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .set('x-tenant-id', 'tenant_urban_spice_002'); // Spoof attempt

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cross-tenant access violation detected');
  });

  it('allows Super Admin to view tenant data when specifying a tenant header', async () => {
    const res = await request(app)
      .get('/api/v1/test/tenant-data')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', 'tenant_highway_dhaba_001');

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('tenant_highway_dhaba_001');
    expect(res.body.userRole).toBe('SUPER_ADMIN');
  });

  it('blocks access if a restaurant account is SUSPENDED', async () => {
    // Suspend Urban Spice temporarily
    await Restaurant.updateOne(
      { tenantId: 'tenant_urban_spice_002' },
      { status: 'SUSPENDED' }
    );

    const res = await request(app)
      .get('/api/v1/test/tenant-data')
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('suspended');

    // Restore status
    await Restaurant.updateOne(
      { tenantId: 'tenant_urban_spice_002' },
      { status: 'ACTIVE' }
    );
  });
});
