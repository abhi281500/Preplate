import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  tenantId: string;
  endpoint: string;
  statusCode: number;
  responseBody: any;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    endpoint: {
      type: String,
      required: true
    },
    statusCode: {
      type: Number,
      required: true
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // Automatically expire after 24 hours (in seconds)
    }
  },
  {
    timestamps: false
  }
);

// Compound index guaranteeing uniqueness per tenant and key
IdempotencyKeySchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const IdempotencyKey = mongoose.model<IIdempotencyKey>(
  'IdempotencyKey',
  IdempotencyKeySchema
);
