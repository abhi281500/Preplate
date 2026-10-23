import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  tenantId?: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: {
      type: String,
      index: true,
      default: null,
      validate: {
        validator: function (this: IUser, val: string | null) {
          if (this.role === 'SUPER_ADMIN') return true;
          return typeof val === 'string' && val.length > 0;
        },
        message: 'TenantId is required for restaurant users'
      }
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'RESTAURANT_STAFF'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true
    },
    permissions: {
      type: [String],
      default: function (this: IUser | undefined) {
        if (this?.role === 'SUPER_ADMIN') return ['*'];
        if (this?.role === 'RESTAURANT_OWNER') return ['orders:*', 'menu:*', 'staff:*', 'settings:*', 'reports:*'];
        return ['orders:view', 'orders:update', 'menu:toggle_availability'];
      }
    },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
