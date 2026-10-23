import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const registerRestaurantSchema = z.object({
  body: z.object({
    restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters').trim(),
    slug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .max(50, 'Slug must not exceed 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
      .toLowerCase()
      .trim(),
    contactPhone: z.string().min(8, 'Contact phone must be at least 8 digits').trim(),
    whatsappNumber: z.string().min(8, 'WhatsApp number must be at least 8 digits').trim(),
    ownerName: z.string().min(2, 'Owner name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters with at least one number and letter')
  })
});
