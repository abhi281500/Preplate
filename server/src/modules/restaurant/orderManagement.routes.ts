import { Router } from 'express';
import {
  getRestaurantOrders,
  getRestaurantOrderById,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  getOrderAnalytics
} from './orderManagement.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { enforceTenantContext } from '../../middleware/tenantContext.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  acceptOrderSchema,
  rejectOrderSchema,
  updateStatusSchema
} from './orderManagement.schema.js';

const router = Router();

// Apply auth & tenant scoping across all restaurant operational order routes
router.use(requireAuth, enforceTenantContext);

// Order Queue & Single Order
router.get('/orders', getRestaurantOrders);
router.get('/orders/:id', getRestaurantOrderById);

// Order Acceptance & Rejection
router.post(
  '/orders/:id/accept',
  requireRole('RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN'),
  validateRequest(acceptOrderSchema),
  acceptOrder
);

router.post(
  '/orders/:id/reject',
  requireRole('RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN'),
  validateRequest(rejectOrderSchema),
  rejectOrder
);

// Kitchen Status Transition (PREPARING -> READY -> SERVED)
router.post(
  '/orders/:id/status',
  requireRole('RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN'),
  validateRequest(updateStatusSchema),
  updateOrderStatus
);

// Operational Metrics
router.get('/analytics/summary', getOrderAnalytics);

export default router;
