import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'PAY_AT_RESTAURANT' | 'UPI_ON_ARRIVAL' | 'RAZORPAY_ONLINE';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface IPaymentAttempt {
  timestamp: Date;
  status: PaymentStatus;
  providerResponse?: string;
  errorMessage?: string;
}

export interface IPayment extends Document {
  tenantId: string;
  orderId: mongoose.Types.ObjectId;
  orderReference: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  providerReference?: string;
  idempotencyKey?: string;
  attempts: IPaymentAttempt[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderReference: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    method: {
      type: String,
      enum: ['PAY_AT_RESTAURANT', 'UPI_ON_ARRIVAL', 'RAZORPAY_ONLINE'],
      default: 'PAY_AT_RESTAURANT',
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      required: true,
      index: true
    },
    provider: {
      type: String,
      default: 'MANUAL_CASHIER',
      trim: true
    },
    providerReference: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      trim: true
    },
    attempts: [
      {
        timestamp: { type: Date, default: Date.now },
        status: { type: String, required: true },
        providerResponse: { type: String },
        errorMessage: { type: String }
      }
    ],
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

PaymentSchema.index({ tenantId: 1, orderReference: 1 });
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
