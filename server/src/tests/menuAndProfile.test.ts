import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';

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

describe('Phase 2: Restaurant Profile, Menu Management & Public Portal Tests', () => {
  let rest1Token: string;
  let rest2Token: string;
  let rest1StaffToken: string;
  let createdCategoryId: string;
  let createdItemId: string;

  beforeAll(async () => {
    // 1. Owner 1 (Highway Dhaba)
    const res1 = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@highwaydhaba.com',
      password: 'DhabaOwner@123'
    });
    rest1Token = res1.body.data.token;

    // 2. Staff 1 (Highway Dhaba)
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
    rest2Token = res2.body.data.token;
  });

  // -------------------------------------------------------------
  // RESTAURANT PROFILE TESTS
  // -------------------------------------------------------------
  it('allows owner to get their restaurant profile', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/profile')
      .set('Authorization', `Bearer ${rest1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('highway-dhaba');
    expect(res.body.data.name).toBe('Highway Dhaba Express');
    expect(res.body.data.settings.orderBufferMinutes).toBe(20);
  });

  it('allows owner to update their restaurant settings & operating hours', async () => {
    const res = await request(app)
      .put('/api/v1/restaurant/profile')
      .set('Authorization', `Bearer ${rest1Token}`)
      .send({
        tagline: 'Best Highway Dhaba with Fresh Clay Oven Tandoor',
        settings: {
          orderBufferMinutes: 25,
          minimumOrderAmount: 120
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tagline).toBe('Best Highway Dhaba with Fresh Clay Oven Tandoor');
    expect(res.body.data.settings.orderBufferMinutes).toBe(25);
    expect(res.body.data.settings.minimumOrderAmount).toBe(120);
  });

  // -------------------------------------------------------------
  // CATEGORY CRUD TESTS
  // -------------------------------------------------------------
  it('returns categories for Restaurant 1 with accurate item counts', async () => {
    const res = await request(app)
      .get('/api/v1/restaurant/categories')
      .set('Authorization', `Bearer ${rest1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const tandooriCat = res.body.data.find((c: any) => c.name === 'Tandoori Starters');
    expect(tandooriCat).toBeDefined();
    expect(tandooriCat.itemCount).toBeGreaterThanOrEqual(2);
  });

  it('allows owner to create a new category', async () => {
    const res = await request(app)
      .post('/api/v1/restaurant/categories')
      .set('Authorization', `Bearer ${rest1Token}`)
      .send({
        name: 'Desserts & Sweets',
        description: 'Traditional mouthwatering Indian desserts',
        displayOrder: 5
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Desserts & Sweets');
    createdCategoryId = res.body.data._id;
  });

  it('prevents creating duplicate category names within the same restaurant', async () => {
    const res = await request(app)
      .post('/api/v1/restaurant/categories')
      .set('Authorization', `Bearer ${rest1Token}`)
      .send({
        name: 'Desserts & Sweets',
        displayOrder: 6
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // MENU ITEM CRUD & 1-CLICK 86ing TESTS
  // -------------------------------------------------------------
  it('allows owner to create a new menu item in their category', async () => {
    const res = await request(app)
      .post('/api/v1/restaurant/menu-items')
      .set('Authorization', `Bearer ${rest1Token}`)
      .send({
        categoryId: createdCategoryId,
        name: 'Gulab Jamun (2 Pcs)',
        description: 'Warm, soft milk dough balls soaked in cardamom flavored sugar syrup.',
        price: 90,
        isVeg: true,
        prepTimeEstimateMinutes: 5,
        isAvailable: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Gulab Jamun (2 Pcs)');
    expect(res.body.data.price).toBe(90);
    expect(res.body.data.isAvailable).toBe(true);
    createdItemId = res.body.data._id;
  });

  it('allows kitchen staff to toggle availability (1-click 86ing to Sold Out)', async () => {
    const res = await request(app)
      .patch(`/api/v1/restaurant/menu-items/${createdItemId}/availability`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAvailable).toBe(false);
    expect(res.body.message).toContain('Sold Out');
  });

  it('allows staff to toggle availability back to Available', async () => {
    const res = await request(app)
      .patch(`/api/v1/restaurant/menu-items/${createdItemId}/availability`)
      .set('Authorization', `Bearer ${rest1StaffToken}`)
      .send({ isAvailable: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAvailable).toBe(true);
  });

  it('prevents deleting a category when menu items are still assigned to it', async () => {
    const res = await request(app)
      .delete(`/api/v1/restaurant/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${rest1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot delete category');
  });

  // -------------------------------------------------------------
  // CROSS-TENANT ISOLATION TESTS
  // -------------------------------------------------------------
  it('blocks Restaurant 2 from creating an item with Restaurant 1 category ID', async () => {
    const res = await request(app)
      .post('/api/v1/restaurant/menu-items')
      .set('Authorization', `Bearer ${rest2Token}`) // Urban Spice Owner
      .send({
        categoryId: createdCategoryId, // Belongs to Highway Dhaba!
        name: 'Hacked Item',
        price: 100,
        isVeg: true
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('does not exist in your restaurant');
  });

  it('blocks Restaurant 2 from editing Restaurant 1 menu item', async () => {
    const res = await request(app)
      .put(`/api/v1/restaurant/menu-items/${createdItemId}`)
      .set('Authorization', `Bearer ${rest2Token}`)
      .send({ name: 'Tampered Name', price: 10 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('blocks Restaurant 2 from toggling availability of Restaurant 1 item', async () => {
    const res = await request(app)
      .patch(`/api/v1/restaurant/menu-items/${createdItemId}/availability`)
      .set('Authorization', `Bearer ${rest2Token}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // PUBLIC PORTAL TESTS
  // -------------------------------------------------------------
  it('returns public restaurant profile for /api/v1/public/restaurants/:slug', async () => {
    const res = await request(app).get('/api/v1/public/restaurants/highway-dhaba');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Highway Dhaba Express');
    expect(res.body.data.slug).toBe('highway-dhaba');
    expect(res.body.data.isOpenNow).toBeDefined();
    expect(res.body.data.settings.currency).toBe('INR');
    // Ensure sensitive tenant information is NOT leaked
    expect(res.body.data.tenantId).toBeUndefined();
    expect(res.body.data.subscriptionId).toBeUndefined();
  });

  it('returns structured public menu with categories and items', async () => {
    const res = await request(app).get('/api/v1/public/restaurants/highway-dhaba/menu');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurant.name).toBe('Highway Dhaba Express');
    expect(Array.isArray(res.body.data.categories)).toBe(true);

    const dessertCat = res.body.data.categories.find((c: any) => c.name === 'Desserts & Sweets');
    expect(dessertCat).toBeDefined();
    expect(dessertCat.items.length).toBe(1);
    expect(dessertCat.items[0].name).toBe('Gulab Jamun (2 Pcs)');
    expect(dessertCat.items[0].price).toBe(90);
    expect(dessertCat.items[0].isVeg).toBe(true);
  });

  it('returns 404 for non-existent restaurant slug', async () => {
    const res = await request(app).get('/api/v1/public/restaurants/non-existent-dhaba');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
