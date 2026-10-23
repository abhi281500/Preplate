import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus } from './Order.js';

export interface IOrderStatusHistory extends Document {
  orderId: mongoose.Types.ObjectId;
  orderReference: string;
  tenantId: string;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  actor: {
    userId?: mongoose.Types.ObjectId;
    role: string;
    name: string;
  };
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderReference: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    previousStatus: { type: String },
    newStatus: { type: String, required: true },
    actor: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, required: true },
      name: { type: String, required: true }
    },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OrderStatusHistorySchema.index({ tenantId: 1, orderId: 1, createdAt: -1 });

export const OrderStatusHistory = mongoose.model<IOrderStatusHistory>(
  'OrderStatusHistory',
  OrderStatusHistorySchema
);
