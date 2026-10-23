import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').trim(),
    description: z.string().trim().optional(),
    displayOrder: z.number().int().default(0),
    isActive: z.boolean().default(true)
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').trim().optional(),
    description: z.string().trim().optional(),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional()
  })
});

export const createMenuItemSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    name: z.string().min(2, 'Item name must be at least 2 characters').trim(),
    description: z.string().trim().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    isVeg: z.boolean().default(true),
    prepTimeEstimateMinutes: z.number().int().min(1, 'Preparation time must be at least 1 minute').default(15),
    isAvailable: z.boolean().default(true),
    imageUrl: z.string().url('Image URL must be a valid URL').optional().or(z.literal('')),
    displayOrder: z.number().int().default(0)
  })
});

export const updateMenuItemSchema = z.object({
  body: z.object({
    categoryId: z.string().optional(),
    name: z.string().min(2, 'Item name must be at least 2 characters').trim().optional(),
    description: z.string().trim().optional(),
    price: z.number().min(0, 'Price must be non-negative').optional(),
    isVeg: z.boolean().optional(),
    prepTimeEstimateMinutes: z.number().int().min(1).optional(),
    isAvailable: z.boolean().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    displayOrder: z.number().int().optional()
  })
});

export const toggleAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean()
  })
});
