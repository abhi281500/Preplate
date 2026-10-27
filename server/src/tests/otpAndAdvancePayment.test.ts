import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../scripts/seed.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { OtpChallenge } from '../models/OtpChallenge.js';

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

describe('Phase 3 & 5: Dual-Flow OTP Authentication & 25% Advance Payment Tests', () => {
  let dalMakhaniId: string;
  let ownerChallengeId: string;
  let ownerTestOtp: string;
  let ownerVerificationToken: string;

  let customerChallengeId: string;
  let customerTestOtp: string;
  let customerVerificationToken: string;
  let createdOrderRef: string;

  beforeAll(async () => {
    const item = await MenuItem.findOne({
      tenantId: 'tenant_highway_dhaba_001',
      name: { $regex: /Dal Makhani/i }
    });
    dalMakhaniId = item!._id.toString();
  });

  // ---------------------------------------------------------------------------
  // 1. Owner Registration OTP Flow
  // ---------------------------------------------------------------------------
  it('should successfully dispatch OTP for RESTAURANT_REGISTRATION purpose', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/send')
      .send({
        phone: '+919811122233',
        purpose: 'RESTAURANT_REGISTRATION'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(300);
    expect(res.body.data.cooldownSeconds).toBe(60);

    ownerChallengeId = res.body.data.challengeId;
    ownerTestOtp = res.body.data.testCode; // populated in test mode
    expect(ownerTestOtp).toMatch(/^\d{6}$/);

    // Verify plaintext code is NOT stored in MongoDB (only HMAC hash)
    const challengeDoc = await OtpChallenge.findOne({ challengeId: ownerChallengeId });
    expect(challengeDoc).toBeDefined();
    expect(challengeDoc?.hmacHash).toBeDefined();
    expect(challengeDoc?.hmacHash).not.toBe(ownerTestOtp);
    expect(challengeDoc?.purpose).toBe('RESTAURANT_REGISTRATION');
  });

  it('should enforce 60-second resend cooldown and reject rapid OTP requests with 429', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/send')
      .send({
        phone: '+919811122233',
        purpose: 'RESTAURANT_REGISTRATION'
      });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Please wait');
  });

  it('should reject invalid 6-digit OTP code with remaining attempt count', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        challengeId: ownerChallengeId,
        phone: '+919811122233',
        code: '000000',
        purpose: 'RESTAURANT_REGISTRATION'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Incorrect verification code');
  });

  it('should reject OTP verification if purpose does not match (cross-flow prevention)', async () => {
    // Attempt to verify owner registration challenge under CUSTOMER_CHECKOUT purpose
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        challengeId: ownerChallengeId,
        phone: '+919811122233',
        code: ownerTestOtp,
        purpose: 'CUSTOMER_CHECKOUT' // Wrong purpose
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid or unrecognized');
  });

  it('should successfully verify correct OTP and return single-use verificationToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        challengeId: ownerChallengeId,
        phone: '+919811122233',
        code: ownerTestOtp,
        purpose: 'RESTAURANT_REGISTRATION'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationToken).toBeDefined();

    ownerVerificationToken = res.body.data.verificationToken;

    // Verify challenge is marked consumed in DB
    const challengeDoc = await OtpChallenge.findOne({ challengeId: ownerChallengeId });
    expect(challengeDoc?.isConsumed).toBe(true);
  });

  it('should reject re-verification of an already consumed challenge (replay protection)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        challengeId: ownerChallengeId,
        phone: '+919811122233',
        code: ownerTestOtp,
        purpose: 'RESTAURANT_REGISTRATION'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already been used');
  });

  it('should onboard new restaurant using the verified owner verificationToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-restaurant')
      .send({
        restaurantName: 'Verified Punjabi Rasoi',
        slug: 'punjabi-rasoi-otp',
        contactPhone: '+919811122233',
        whatsappNumber: '+919811122233',
        ownerName: 'Gurpreet Singh',
        email: 'gurpreet@punjabirasoi.com',
        password: 'Password@2026!',
        verificationToken: ownerVerificationToken
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurant.slug).toBe('punjabi-rasoi-otp');
  });

  // ---------------------------------------------------------------------------
  // 2. Customer Checkout OTP & 25% Advance Calculation
  // ---------------------------------------------------------------------------
  it('should dispatch OTP for CUSTOMER_CHECKOUT flow', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/send')
      .send({
        phone: '+919988776655',
        purpose: 'CUSTOMER_CHECKOUT'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    customerChallengeId = res.body.data.challengeId;
    customerTestOtp = res.body.data.testCode;
    expect(customerTestOtp).toMatch(/^\d{6}$/);
  });

  it('should verify customer checkout OTP and receive customer verificationToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        challengeId: customerChallengeId,
        phone: '+919988776655',
        code: customerTestOtp,
        purpose: 'CUSTOMER_CHECKOUT'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationToken).toBeDefined();
    customerVerificationToken = res.body.data.verificationToken;
  });

  it('should place order and accurately calculate minimum 25% advance and remaining balance', async () => {
    const arrivalTime = new Date(Date.now() + 45 * 60 * 1000);
    // Adjust hour if outside operating hours (11-21)
    if (arrivalTime.getHours() < 11 || arrivalTime.getHours() > 21) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
      arrivalTime.setHours(14, 0, 0, 0);
    }

    // Dal Makhani is ₹220, ordering 2 portions = ₹440
    // Tax 5% = Math.round(440 * 0.05) = ₹22
    // Total Amount = ₹462
    // Minimum 25% Advance: Math.ceil(462 * 0.25) = Math.ceil(115.5) = ₹116
    // Remaining Balance = 462 - 116 = ₹346

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: {
          name: 'Arjun Verma',
          phone: '+919988776655',
          specialInstructions: 'Serving upon arrival',
          verificationToken: customerVerificationToken
        },
        items: [{ menuItemId: dalMakhaniId, quantity: 2 }],
        expectedArrivalTime: arrivalTime.toISOString(),
        paymentMethod: 'PAY_AT_RESTAURANT'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const pricing = res.body.data.pricing;
    expect(pricing.subtotal).toBe(440);
    expect(pricing.taxAmount).toBe(22);
    expect(pricing.totalAmount).toBe(462);
    expect(pricing.advancePercent).toBe(25);
    expect(pricing.requiredAdvanceAmount).toBe(116);
    expect(pricing.remainingBalanceAmount).toBe(462); // Pay at counter leaves full balance on arrival

    createdOrderRef = res.body.data.orderReference;

    // Verify standalone Payment record
    const payment = await Payment.findOne({ orderReference: createdOrderRef });
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(462);
    expect(payment?.status).toBe('PENDING');
  });

  it('should support RAZORPAY_ONLINE capturing the 25% advance upon order placement', async () => {
    const arrivalTime = new Date(Date.now() + 50 * 60 * 1000);
    if (arrivalTime.getHours() < 11 || arrivalTime.getHours() > 21) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
      arrivalTime.setHours(15, 0, 0, 0);
    }

    const res = await request(app)
      .post('/api/v1/public/restaurants/highway-dhaba/orders')
      .send({
        customer: {
          name: 'Priya Sharma',
          phone: '+919988776655'
        },
        items: [{ menuItemId: dalMakhaniId, quantity: 1 }], // ₹220 + ₹11 tax = ₹231
        expectedArrivalTime: arrivalTime.toISOString(),
        paymentMethod: 'RAZORPAY_ONLINE'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Total: 231
    // Required Advance: Math.ceil(231 * 0.25) = 58
    // Captured: 58
    // Remaining Balance: 231 - 58 = 173
    const pricing = res.body.data.pricing;
    expect(pricing.totalAmount).toBe(231);
    expect(pricing.requiredAdvanceAmount).toBe(58);
    expect(pricing.capturedAdvanceAmount).toBe(58);
    expect(pricing.remainingBalanceAmount).toBe(173);

    const onlineOrderRef = res.body.data.orderReference;
    const payment = await Payment.findOne({ orderReference: onlineOrderRef });
    expect(payment?.status).toBe('CAPTURED');
  });

  it('should mark payment status as REFUNDED when an accepted/pending order is cancelled', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/highway-dhaba/orders/${createdOrderRef}/cancel`)
      .send({ reason: 'Diner flight delayed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');

    // Verify Payment document transitioned to REFUNDED
    const payment = await Payment.findOne({ orderReference: createdOrderRef });
    expect(payment?.status).toBe('REFUNDED');
  });
});
