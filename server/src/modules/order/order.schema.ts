import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').trim(),
      phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15).trim(),
      specialInstructions: z.string().max(300, 'Instructions must not exceed 300 characters').trim().optional()
    }),
    items: z
      .array(
        z.object({
          menuItemId: z.string().min(1, 'Menu item ID is required'),
          quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item')
        })
      )
      .min(1, 'Order must contain at least one item'),
    expectedArrivalTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid expected arrival time date format'
    }),
    paymentMethod: z.enum(['PAY_AT_RESTAURANT', 'UPI_ON_ARRIVAL', 'ONLINE', 'RAZORPAY_ONLINE']).default('PAY_AT_RESTAURANT')
  })
});

export const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().max(200).optional()
  })
});
