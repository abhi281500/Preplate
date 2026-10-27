import mongoose, { Document, Schema } from 'mongoose';

export type OtpPurpose = 'RESTAURANT_REGISTRATION' | 'CUSTOMER_CHECKOUT';

export interface IOtpChallenge extends Document {
  challengeId: string;
  phone: string;
  hmacHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  isConsumed: boolean;
  consumedAt?: Date;
  resendAfter: Date;
  expiresAt: Date;
  createdAt: Date;
}

const OtpChallengeSchema = new Schema<IOtpChallenge>(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    hmacHash: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ['RESTAURANT_REGISTRATION', 'CUSTOMER_CHECKOUT'],
      required: true,
      index: true
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    isConsumed: {
      type: Boolean,
      default: false,
      index: true
    },
    consumedAt: {
      type: Date
    },
    resendAfter: {
      type: Date,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Automatic TTL expiration when Date reaches expiresAt
    }
  },
  {
    timestamps: true
  }
);

OtpChallengeSchema.index({ phone: 1, purpose: 1, isConsumed: 1 });

export const OtpChallenge = mongoose.model<IOtpChallenge>(
  'OtpChallenge',
  OtpChallengeSchema
);
