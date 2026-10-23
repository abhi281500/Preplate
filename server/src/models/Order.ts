import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentMethod = 'PAY_AT_RESTAURANT' | 'UPI_ON_ARRIVAL' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface IOrderItemSnapshot {
  menuItemId: mongoose.Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

export interface IOrderCustomer {
  name: string;
  phone: string;
  specialInstructions?: string;
}

export interface IOrderPricing {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface IOrderScheduling {
  expectedArrivalTime: Date;
  estimatedReadyTime?: Date;
  actualReadyTime?: Date;
  acceptedAt?: Date;
  servedAt?: Date;
}

export interface IOrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
}

export interface IOrder extends Document {
  orderReference: string;
  tenantId: string;
  customer: IOrderCustomer;
  items: IOrderItemSnapshot[];
  pricing: IOrderPricing;
  scheduling: IOrderScheduling;
  status: OrderStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  payment: IOrderPayment;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const OrderCustomerSchema = new Schema<IOrderCustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    specialInstructions: { type: String, trim: true }
  },
  { _id: false }
);

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const OrderSchedulingSchema = new Schema<IOrderScheduling>(
  {
    expectedArrivalTime: { type: Date, required: true },
    estimatedReadyTime: { type: Date },
    actualReadyTime: { type: Date },
    acceptedAt: { type: Date },
    servedAt: { type: Date }
  },
  { _id: false }
);

const OrderPaymentSchema = new Schema<IOrderPayment>(
  {
    method: {
      type: String,
      enum: ['PAY_AT_RESTAURANT', 'UPI_ON_ARRIVAL', 'ONLINE'],
      default: 'PAY_AT_RESTAURANT'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED'],
      default: 'PENDING'
    },
    transactionReference: { type: String }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderReference: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    customer: { type: OrderCustomerSchema, required: true },
    items: { type: [OrderItemSnapshotSchema], required: true },
    pricing: { type: OrderPricingSchema, required: true },
    scheduling: { type: OrderSchedulingSchema, required: true },
    status: {
      type: String,
      enum: [
        'PENDING_CONFIRMATION',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'SERVED',
        'REJECTED',
        'CANCELLED',
        'EXPIRED'
      ],
      default: 'PENDING_CONFIRMATION',
      index: true
    },
    rejectionReason: { type: String },
    cancellationReason: { type: String },
    payment: { type: OrderPaymentSchema, default: () => ({ method: 'PAY_AT_RESTAURANT', status: 'PENDING' }) }
  },
  { timestamps: true }
);

OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, 'scheduling.expectedArrivalTime': 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
