import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { OtpChallenge, OtpPurpose } from '../models/OtpChallenge.js';

export interface SendOtpResult {
  challengeId: string;
  phone: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  verificationToken?: string;
}

export class OtpService {
  private static getHmacSecret(): string {
    return process.env.OTP_HMAC_SECRET || env.JWT_SECRET;
  }

  private static hashOtp(code: string): string {
    return crypto
      .createHmac('sha256', this.getHmacSecret())
      .update(code)
      .digest('hex');
  }

  public static normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '').trim();
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // Default to +91 (India) if 10-digit number
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  }

  public static async createChallenge(
    rawPhone: string,
    purpose: OtpPurpose
  ): Promise<{ result: SendOtpResult; rawCodeForTesting?: string }> {
    const phone = this.normalizePhone(rawPhone);
    const now = new Date();

    // 1. Check for active unconsumed challenge within resend cooldown
    const existingActive = await OtpChallenge.findOne({
      phone,
      purpose,
      isConsumed: false,
      expiresAt: { $gt: now }
    }).sort({ createdAt: -1 });

    if (existingActive && existingActive.resendAfter > now) {
      const waitSeconds = Math.ceil(
        (existingActive.resendAfter.getTime() - now.getTime()) / 1000
      );
      const error: any = new Error(
        `Please wait ${waitSeconds} seconds before requesting a new verification code.`
      );
      error.statusCode = 429;
      throw error;
    }

    // 2. Invalidate any prior challenges for this phone and purpose
    await OtpChallenge.updateMany(
      { phone, purpose, isConsumed: false },
      { $set: { isConsumed: true, consumedAt: now } }
    );

    // 3. Generate cryptographically secure 6-digit numeric code
    const randomInt = crypto.randomInt(100000, 999999);
    const code = randomInt.toString();
    const hmacHash = this.hashOtp(code);
    const challengeId = crypto.randomUUID();

    const expiresInSeconds = 300; // 5 minutes
    const cooldownSeconds = 60; // 60 seconds

    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
    const resendAfter = new Date(now.getTime() + cooldownSeconds * 1000);

    // 4. Persist challenge with HMAC hash (never store plaintext)
    await OtpChallenge.create({
      challengeId,
      phone,
      hmacHash,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      isConsumed: false,
      resendAfter,
      expiresAt
    });

    // 5. Provider delivery boundary
    // In production, integrate with SMS Provider (Fast2SMS / Twilio).
    // In test/development, log or expose safely for automated verification.
    if (env.NODE_ENV !== 'production') {
      console.log(`🔑 [OTP_DISPATCH] Phone: ${phone} | Purpose: ${purpose} | Code: ${code}`);
    }

    return {
      result: {
        challengeId,
        phone,
        purpose,
        expiresInSeconds,
        cooldownSeconds
      },
      rawCodeForTesting: env.NODE_ENV === 'test' ? code : undefined
    };
  }

  public static async verifyChallenge(
    challengeId: string,
    rawPhone: string,
    code: string,
    purpose: OtpPurpose
  ): Promise<VerifyOtpResult> {
    const phone = this.normalizePhone(rawPhone);
    const now = new Date();

    const challenge = await OtpChallenge.findOne({
      challengeId,
      phone,
      purpose
    });

    if (!challenge) {
      return {
        success: false,
        message: 'Invalid or unrecognized verification challenge.'
      };
    }

    if (challenge.isConsumed) {
      return {
        success: false,
        message: 'This verification code has already been used. Please request a new one.'
      };
    }

    if (challenge.expiresAt < now) {
      return {
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.isConsumed = true;
      challenge.consumedAt = now;
      await challenge.save();
      return {
        success: false,
        message: 'Too many incorrect attempts. This challenge has been revoked. Please request a new code.'
      };
    }

    // Increment attempts
    challenge.attempts += 1;

    // Timing-safe HMAC comparison
    const incomingHmac = this.hashOtp(code.trim());
    const expectedBuffer = Buffer.from(challenge.hmacHash, 'hex');
    const incomingBuffer = Buffer.from(incomingHmac, 'hex');

    const isValid =
      expectedBuffer.length === incomingBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, incomingBuffer);

    if (!isValid) {
      await challenge.save();
      const remaining = challenge.maxAttempts - challenge.attempts;
      return {
        success: false,
        message: `Incorrect verification code. ${remaining} attempt(s) remaining.`
      };
    }

    // Mark challenge as consumed (single-use)
    challenge.isConsumed = true;
    challenge.consumedAt = now;
    await challenge.save();

    // Issue verified proof token valid for 15 minutes
    const verificationToken = jwt.sign(
      {
        phone,
        purpose,
        challengeId,
        verifiedAt: now.toISOString()
      },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return {
      success: true,
      message: 'Phone number verified successfully.',
      verificationToken
    };
  }

  public static verifyProofToken(
    token: string,
    expectedPhone: string,
    expectedPurpose: OtpPurpose
  ): boolean {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      const normalizedExpected = this.normalizePhone(expectedPhone);
      return (
        decoded.phone === normalizedExpected &&
        decoded.purpose === expectedPurpose
      );
    } catch {
      return false;
    }
  }
}
