import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { runSeed } from '../scripts/seed.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await runSeed();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 1: Foundation, Authentication & Security Core Tests', () => {
  it('should return 200 OK from health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Preplate API');
  });

  it('should authenticate Platform Super Admin with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@preplate.io',
        password: 'Admin@Preplate2026!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    expect(res.body.data.user.tenantId).toBeNull();
  });

  it('should authenticate Restaurant Owner and return associated tenant info', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@highwaydhaba.com',
        password: 'DhabaOwner@123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('RESTAURANT_OWNER');
    expect(res.body.data.user.tenantId).toBe('tenant_highway_dhaba_001');
    expect(res.body.data.restaurant.slug).toBe('highway-dhaba');
  });

  it('should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@highwaydhaba.com',
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should validate registration input and reject invalid slug characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-restaurant')
      .send({
        restaurantName: 'Invalid Cafe',
        slug: 'invalid slug with spaces!',
        contactPhone: '9876543210',
        whatsappNumber: '9876543210',
        ownerName: 'Test Owner',
        email: 'test@invalid.com',
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject registration when slug is already taken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-restaurant')
      .send({
        restaurantName: 'Highway Duplicate',
        slug: 'highway-dhaba', // Already seeded
        contactPhone: '+919999999999',
        whatsappNumber: '+919999999999',
        ownerName: 'Duplicate Owner',
        email: 'newowner@dhaba.com',
        password: 'SecurePassword123'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already registered');
  });

  it('should successfully onboard a new restaurant with isolated tenant identity', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-restaurant')
      .send({
        restaurantName: 'Mountain Chai Stop',
        slug: 'mountain-chai',
        contactPhone: '+919876543299',
        whatsappNumber: '+919876543299',
        ownerName: 'Vikram Negi',
        email: 'vikram@mountainchai.com',
        password: 'MountainPassword123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.restaurant.slug).toBe('mountain-chai');
    expect(res.body.data.restaurant.tenantId).toBeDefined();

    // Verify in database
    const dbRestaurant = await Restaurant.findOne({ slug: 'mountain-chai' });
    expect(dbRestaurant).not.toBeNull();
    expect(dbRestaurant?.name).toBe('Mountain Chai Stop');

    const dbUser = await User.findOne({ email: 'vikram@mountainchai.com' });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.tenantId).toBe(dbRestaurant?.tenantId);
    expect(dbUser?.role).toBe('RESTAURANT_OWNER');
  });

  it('should return authenticated user data on /api/v1/auth/me', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@highwaydhaba.com',
        password: 'DhabaOwner@123'
      });

    const token = loginRes.body.data.token;

    // 2. Call /me with Bearer token
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('owner@highwaydhaba.com');
    expect(meRes.body.data.restaurant.slug).toBe('highway-dhaba');
  });

  it('should reject unauthenticated request on /api/v1/auth/me with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
