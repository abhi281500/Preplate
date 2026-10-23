import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  planKey: string; // e.g. 'STARTER', 'PRO', 'ENTERPRISE'
  name: string;
  description?: string;
  priceINR: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  features: {
    maxMenuItems: number;
    maxStaffAccounts: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    planKey: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priceINR: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    features: {
      maxMenuItems: { type: Number, default: 50 },
      maxStaffAccounts: { type: Number, default: 3 },
      analyticsAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
);
