import { z } from 'zod';

export const updateRestaurantProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
    tagline: z.string().trim().optional(),
    contactPhone: z.string().min(8, 'Phone must be at least 8 digits').trim().optional(),
    whatsappNumber: z.string().min(8, 'WhatsApp must be at least 8 digits').trim().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional()
      })
      .optional(),
    operatingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format'),
          closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format'),
          isOpen: z.boolean()
        })
      )
      .optional(),
    settings: z
      .object({
        orderBufferMinutes: z.number().min(5).max(180).optional(),
        autoRejectTimeoutMinutes: z.number().min(5).max(60).optional(),
        allowPayAtRestaurant: z.boolean().optional(),
        minimumOrderAmount: z.number().min(0).optional(),
        upiId: z.string().optional()
      })
      .optional()
  })
});
