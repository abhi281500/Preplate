import mongoose, { Document, Schema } from 'mongoose';

export type NotificationChannel = 'WHATSAPP_CLICK_TO_CHAT' | 'WHATSAPP_CLOUD_API';

export type NotificationPurpose =
  | 'ORDER_SUBMITTED_REQUEST'
  | 'ORDER_ACCEPTED_ALERT'
  | 'ORDER_READY_ALERT'
  | 'ORDER_REJECTED_ALERT'
  | 'ORDER_CANCELLED_ALERT';

export type NotificationDeliveryState =
  | 'PREFILLED_LINK_GENERATED'
  | 'DISPATCH_QUEUED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';

export interface INotificationLog extends Document {
  tenantId: string;
  orderId?: mongoose.Types.ObjectId;
  orderReference?: string;
  recipientPhone: string;
  recipientRole: 'RESTAURANT' | 'CUSTOMER';
  channel: NotificationChannel;
  purpose: NotificationPurpose;
  deliveryState: NotificationDeliveryState;
  messagePayload: string;
  providerMessageId?: string;
  attemptCount: number;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    tenantId: { type: String, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderReference: { type: String, index: true },
    recipientPhone: { type: String, required: true },
    recipientRole: {
      type: String,
      enum: ['RESTAURANT', 'CUSTOMER'],
      required: true
    },
    channel: {
      type: String,
      enum: ['WHATSAPP_CLICK_TO_CHAT', 'WHATSAPP_CLOUD_API'],
      default: 'WHATSAPP_CLICK_TO_CHAT'
    },
    purpose: {
      type: String,
      enum: [
        'ORDER_SUBMITTED_REQUEST',
        'ORDER_ACCEPTED_ALERT',
        'ORDER_READY_ALERT',
        'ORDER_REJECTED_ALERT',
        'ORDER_CANCELLED_ALERT'
      ],
      required: true
    },
    deliveryState: {
      type: String,
      enum: [
        'PREFILLED_LINK_GENERATED',
        'DISPATCH_QUEUED',
        'DISPATCHED',
        'DELIVERED',
        'READ',
        'FAILED'
      ],
      default: 'PREFILLED_LINK_GENERATED'
    },
    messagePayload: { type: String, required: true },
    providerMessageId: { type: String },
    attemptCount: { type: Number, default: 1 },
    errorDetails: { type: String }
  },
  { timestamps: true }
);

NotificationLogSchema.index({ tenantId: 1, createdAt: -1 });
NotificationLogSchema.index({ orderReference: 1, purpose: 1 });

export const NotificationLog = mongoose.model<INotificationLog>(
  'NotificationLog',
  NotificationLogSchema
);
