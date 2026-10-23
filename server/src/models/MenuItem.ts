import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  tenantId: string;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number; // In INR
  isVeg: boolean;
  prepTimeEstimateMinutes: number;
  isAvailable: boolean; // Toggled by staff/owner for 86ing
  imageUrl?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    tenantId: { type: String, required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
    prepTimeEstimateMinutes: { type: Number, default: 15, min: 1 },
    isAvailable: { type: Boolean, default: true, index: true },
    imageUrl: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

MenuItemSchema.index({ tenantId: 1, categoryId: 1, isAvailable: 1 });
MenuItemSchema.index({ tenantId: 1, name: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
