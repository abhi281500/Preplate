import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  updateStockQuantity
} from './menu.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { enforceTenantContext } from '../../middleware/tenantContext.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  toggleAvailabilitySchema
} from './menu.schema.js';

const router = Router();

// Apply auth & tenant scoping across all restaurant menu management routes
router.use(requireAuth, enforceTenantContext);

// Category Routes
router.get('/categories', getCategories);
router.post(
  '/categories',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  validateRequest(createCategorySchema),
  createCategory
);
router.put(
  '/categories/:id',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  validateRequest(updateCategorySchema),
  updateCategory
);
router.delete(
  '/categories/:id',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  deleteCategory
);

// Menu Item Routes
router.get('/menu-items', getMenuItems);
router.post(
  '/menu-items',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  validateRequest(createMenuItemSchema),
  createMenuItem
);
router.put(
  '/menu-items/:id',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  validateRequest(updateMenuItemSchema),
  updateMenuItem
);
router.delete(
  '/menu-items/:id',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  deleteMenuItem
);

// 1-Click Availability Toggle (Staff and Owners can toggle)
router.patch(
  '/menu-items/:id/availability',
  requireRole('RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN'),
  validateRequest(toggleAvailabilitySchema),
  toggleAvailability
);

// Production Inventory & Portion Quota Control (Staff and Owners can adjust)
router.patch(
  '/menu-items/:id/stock',
  requireRole('RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN'),
  updateStockQuantity
);

export default router;
