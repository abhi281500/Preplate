import mongoose, { Document, Schema } from 'mongoose';

export interface IOperatingHour {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  openTime: string;  // e.g. "09:00"
  closeTime: string; // e.g. "22:00"
  isOpen: boolean;
}

export interface IRestaurantSettings {
  orderBufferMinutes: number;       // Minimum minutes in advance an order can be scheduled (default 20)
  autoRejectTimeoutMinutes: number; // Minutes before unaccepted orders expire (default 15)
  currency: string;                 // Default "INR"
  allowPayAtRestaurant: boolean;    // Default true
  minimumOrderAmount: number;       // Default 0
  upiId?: string;                   // Optional UPI VPA for direct QR display
}

export interface IRestaurant extends Document {
  tenantId: string;
  name: string;
  slug: string;
  tagline?: string;
  contactPhone: string;
  whatsappNumber: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  operatingHours: IOperatingHour[];
  settings: IRestaurantSettings;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';
  subscriptionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OperatingHourSchema = new Schema<IOperatingHour>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    openTime: { type: String, required: true, default: '10:00' },
    closeTime: { type: String, required: true, default: '22:00' },
    isOpen: { type: Boolean, required: true, default: true }
  },
  { _id: false }
);

const RestaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    orderBufferMinutes: { type: Number, default: 20, min: 5 },
    autoRejectTimeoutMinutes: { type: Number, default: 15, min: 5 },
    currency: { type: String, default: 'INR' },
    allowPayAtRestaurant: { type: Boolean, default: true },
    minimumOrderAmount: { type: Number, default: 0, min: 0 },
    upiId: { type: String }
  },
  { _id: false }
);

const RestaurantSchema = new Schema<IRestaurant>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    tagline: { type: String, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true }
    },
    operatingHours: {
      type: [OperatingHourSchema],
      default: () => [
        { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isOpen: true },
        { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isOpen: true },
        { dayOfWeek: 2, openTime: '10:00', closeTime: '22:00', isOpen: true },
        { dayOfWeek: 3, openTime: '10:00', closeTime: '22:00', isOpen: true },
        { dayOfWeek: 4, openTime: '10:00', closeTime: '22:00', isOpen: true },
        { dayOfWeek: 5, openTime: '10:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 6, openTime: '10:00', closeTime: '23:00', isOpen: true }
      ]
    },
    settings: {
      type: RestaurantSettingsSchema,
      default: () => ({
        orderBufferMinutes: 20,
        autoRejectTimeoutMinutes: 15,
        currency: 'INR',
        allowPayAtRestaurant: true,
        minimumOrderAmount: 0
      })
    },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'],
      default: 'PENDING_APPROVAL',
      index: true
    },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
