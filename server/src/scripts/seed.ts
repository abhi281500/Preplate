import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription } from '../models/Subscription.js';

export async function runSeed(skipConnect = false): Promise<void> {
  if (env.NODE_ENV !== 'test') {
    console.log('🌱 Starting Preplate Database Seed...');
  }
  if (!skipConnect && mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // 1. Seed Subscription Plans
  if (env.NODE_ENV !== 'test') console.log('📦 Seeding Subscription Plans...');
  const plans = [
    {
      planKey: 'STARTER',
      name: 'Starter Pilot Plan',
      description: 'Ideal for small cafes and roadside eateries beginning pre-arrival ordering.',
      priceINR: 499,
      billingCycle: 'MONTHLY' as const,
      features: {
        maxMenuItems: 30,
        maxStaffAccounts: 2,
        analyticsAccess: false,
        prioritySupport: false
      },
      isActive: true
    },
    {
      planKey: 'PRO',
      name: 'Pro Restaurant Plan',
      description: 'For busy dine-in and highway restaurants needing high-volume kitchen coordination.',
      priceINR: 999,
      billingCycle: 'MONTHLY' as const,
      features: {
        maxMenuItems: 100,
        maxStaffAccounts: 6,
        analyticsAccess: true,
        prioritySupport: true
      },
      isActive: true
    }
  ];

  const planMap: Record<string, string> = {};
  for (const p of plans) {
    const existing = await SubscriptionPlan.findOneAndUpdate(
      { planKey: p.planKey },
      p,
      { upsert: true, new: true }
    );
    planMap[p.planKey] = existing._id.toString();
  }

  // 2. Seed Super Admin
  if (env.NODE_ENV !== 'test') console.log('👤 Seeding Platform Super Admin...');
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const superAdminPasswordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, salt);

  await User.findOneAndUpdate(
    { email: env.SUPERADMIN_EMAIL },
    {
      name: env.SUPERADMIN_NAME,
      email: env.SUPERADMIN_EMAIL,
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: null,
      permissions: ['*']
    },
    { upsert: true }
  );

  // 3. Seed Pilot Restaurant 1: "Highway Dhaba Express"
  if (env.NODE_ENV !== 'test') console.log('🏪 Seeding Tenant 1: Highway Dhaba Express...');
  const tenant1Id = 'tenant_highway_dhaba_001';
  const rest1 = await Restaurant.findOneAndUpdate(
    { tenantId: tenant1Id },
    {
      tenantId: tenant1Id,
      name: 'Highway Dhaba Express',
      slug: 'highway-dhaba',
      tagline: 'Authentic Punjabi taste on the expressway, hot and ready upon arrival.',
      contactPhone: '+919876543210',
      whatsappNumber: '+919876543210',
      address: {
        street: 'KM 42, Delhi-Jaipur National Highway',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122001'
      },
      settings: {
        orderBufferMinutes: 20,
        autoRejectTimeoutMinutes: 15,
        currency: 'INR',
        allowPayAtRestaurant: true,
        minimumOrderAmount: 100,
        upiId: 'highwaydhaba@upi'
      },
      status: 'ACTIVE'
    },
    { upsert: true, new: true }
  );

  // Assign Pro Plan to Restaurant 1
  if (planMap['PRO']) {
    const sub = await Subscription.findOneAndUpdate(
      { tenantId: tenant1Id },
      {
        tenantId: tenant1Id,
        planId: planMap['PRO'],
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true }
    );
    rest1.subscriptionId = sub._id;
    await rest1.save();
  }

  // Seed Owner for Restaurant 1
  const rest1OwnerHash = await bcrypt.hash('DhabaOwner@123', salt);
  await User.findOneAndUpdate(
    { email: 'owner@highwaydhaba.com' },
    {
      tenantId: tenant1Id,
      name: 'Harpreet Singh',
      email: 'owner@highwaydhaba.com',
      passwordHash: rest1OwnerHash,
      role: 'RESTAURANT_OWNER',
      status: 'ACTIVE'
    },
    { upsert: true }
  );

  // Seed Staff for Restaurant 1
  const rest1StaffHash = await bcrypt.hash('KitchenStaff@123', salt);
  await User.findOneAndUpdate(
    { email: 'kitchen@highwaydhaba.com' },
    {
      tenantId: tenant1Id,
      name: 'Ramu Chef',
      email: 'kitchen@highwaydhaba.com',
      passwordHash: rest1StaffHash,
      role: 'RESTAURANT_STAFF',
      status: 'ACTIVE'
    },
    { upsert: true }
  );

  // Categories & Items for Restaurant 1
  const catStarters = await Category.findOneAndUpdate(
    { tenantId: tenant1Id, name: 'Tandoori Starters' },
    { tenantId: tenant1Id, name: 'Tandoori Starters', displayOrder: 1, isActive: true },
    { upsert: true, new: true }
  );

  const catMains = await Category.findOneAndUpdate(
    { tenantId: tenant1Id, name: 'Highway Curries' },
    { tenantId: tenant1Id, name: 'Highway Curries', displayOrder: 2, isActive: true },
    { upsert: true, new: true }
  );

  const catBreads = await Category.findOneAndUpdate(
    { tenantId: tenant1Id, name: 'Tandoori Breads' },
    { tenantId: tenant1Id, name: 'Tandoori Breads', displayOrder: 3, isActive: true },
    { upsert: true, new: true }
  );

  const catBeverages = await Category.findOneAndUpdate(
    { tenantId: tenant1Id, name: 'Beverages & Lassi' },
    { tenantId: tenant1Id, name: 'Beverages & Lassi', displayOrder: 4, isActive: true },
    { upsert: true, new: true }
  );

  const rest1Items = [
    {
      tenantId: tenant1Id,
      categoryId: catStarters._id,
      name: 'Paneer Tikka (Tandoori)',
      description: 'Cubes of fresh cottage cheese marinated in spiced yogurt and grilled in earthen clay oven.',
      price: 240,
      isVeg: true,
      prepTimeEstimateMinutes: 20,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop'
    },
    {
      tenantId: tenant1Id,
      categoryId: catStarters._id,
      name: 'Tandoori Chicken (Half)',
      description: 'Spring chicken roasted with traditional Punjabi tandoori spices.',
      price: 290,
      isVeg: false,
      prepTimeEstimateMinutes: 25,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop'
    },
    {
      tenantId: tenant1Id,
      categoryId: catMains._id,
      name: 'Special Dal Makhani',
      description: 'Slow-simmered black lentils over charcoal with rich butter and cream.',
      price: 220,
      isVeg: true,
      prepTimeEstimateMinutes: 15,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop'
    },
    {
      tenantId: tenant1Id,
      categoryId: catMains._id,
      name: 'Butter Chicken (Boneless)',
      description: 'Charcoal grilled chicken cooked in a rich, buttery, velvety tomato gravy.',
      price: 340,
      isVeg: false,
      prepTimeEstimateMinutes: 20,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop'
    },
    {
      tenantId: tenant1Id,
      categoryId: catBreads._id,
      name: 'Butter Naan',
      description: 'Crisp yet soft tandoori flatbread glazed with pure churned butter.',
      price: 45,
      isVeg: true,
      prepTimeEstimateMinutes: 10,
      isAvailable: true
    },
    {
      tenantId: tenant1Id,
      categoryId: catBeverages._id,
      name: 'Punjabi Kulhad Lassi (Sweet)',
      description: 'Thick, creamy yogurt lassi served in traditional clay kulhad with fresh malai.',
      price: 80,
      isVeg: true,
      prepTimeEstimateMinutes: 5,
      isAvailable: true
    }
  ];

  for (const item of rest1Items) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant1Id, name: item.name },
      item,
      { upsert: true }
    );
  }

  // 4. Seed Pilot Restaurant 2: "Urban Spice Cafe" (To test multi-tenant isolation)
  console.log('🏪 Seeding Tenant 2: Urban Spice Cafe...');
  const tenant2Id = 'tenant_urban_spice_002';
  await Restaurant.findOneAndUpdate(
    { tenantId: tenant2Id },
    {
      tenantId: tenant2Id,
      name: 'Urban Spice Cafe',
      slug: 'urban-spice',
      tagline: 'Artisanal coffee and healthy bowls for busy urban professionals.',
      contactPhone: '+919123456780',
      whatsappNumber: '+919123456780',
      address: {
        street: 'Cyber Hub, DLF Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122002'
      },
      settings: {
        orderBufferMinutes: 15,
        autoRejectTimeoutMinutes: 10,
        currency: 'INR',
        allowPayAtRestaurant: true,
        minimumOrderAmount: 150
      },
      status: 'ACTIVE'
    },
    { upsert: true }
  );

  const rest2OwnerHash = await bcrypt.hash('UrbanOwner@123', salt);
  await User.findOneAndUpdate(
    { email: 'owner@urbanspice.com' },
    {
      tenantId: tenant2Id,
      name: 'Priya Sharma',
      email: 'owner@urbanspice.com',
      passwordHash: rest2OwnerHash,
      role: 'RESTAURANT_OWNER',
      status: 'ACTIVE'
    },
    { upsert: true }
  );

  const catCafe = await Category.findOneAndUpdate(
    { tenantId: tenant2Id, name: 'Beverages' },
    { tenantId: tenant2Id, name: 'Beverages', displayOrder: 1, isActive: true },
    { upsert: true, new: true }
  );

  await MenuItem.findOneAndUpdate(
    { tenantId: tenant2Id, name: 'Cold Brew Coffee' },
    {
      tenantId: tenant2Id,
      categoryId: catCafe._id,
      name: 'Cold Brew Coffee',
      description: 'Slow steep cold extracted single origin Arabica.',
      price: 180,
      isVeg: true,
      prepTimeEstimateMinutes: 5,
      isAvailable: true
    },
    { upsert: true }
  );

  if (env.NODE_ENV !== 'test') {
    console.log('✨ Seed complete!');
    console.log('----------------------------------------------------');
    console.log('Super Admin Login:');
    console.log(`  Email:    ${env.SUPERADMIN_EMAIL}`);
    console.log(`  Password: ${env.SUPERADMIN_PASSWORD}`);
    console.log('Restaurant 1 (Highway Dhaba) Owner Login:');
    console.log('  Email:    owner@highwaydhaba.com');
    console.log('  Password: DhabaOwner@123');
    console.log('Restaurant 1 Public Slug: /r/highway-dhaba');
    console.log('Restaurant 2 (Urban Spice) Owner Login:');
    console.log('  Email:    owner@urbanspice.com');
    console.log('  Password: UrbanOwner@123');
    console.log('Restaurant 2 Public Slug: /r/urban-spice');
    console.log('----------------------------------------------------');
  }
}

// Execute directly if run as CLI script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed Failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}
