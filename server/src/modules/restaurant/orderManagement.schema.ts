import { z } from 'zod';

export const acceptOrderSchema = z.object({
  body: z.object({
    prepDurationMinutes: z
      .number()
      .int()
      .min(5, 'Minimum preparation estimate is 5 minutes')
      .max(180, 'Maximum preparation estimate is 180 minutes')
      .default(20)
  })
});

export const rejectOrderSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .min(3, 'Rejection reason must be at least 3 characters')
      .max(200, 'Rejection reason must not exceed 200 characters')
      .trim()
  })
});

export const updateStatusSchema = z.object({
  body: z.object({
    nextStatus: z.enum(['PREPARING', 'READY', 'SERVED'], {
      errorMap: () => ({ message: 'Next status must be PREPARING, READY, or SERVED' })
    })
  })
});
