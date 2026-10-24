import express from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  getPlatformOverview,
  getRestaurants,
  getRestaurantById,
  updateRestaurantStatus,
  updateRestaurantPlan,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAuditLogs
} from './super.controller.js';

const router = express.Router();

// Strict platform super-admin role enforcement for all /api/v1/super/* endpoints
router.use(requireAuth as any, requireRole('SUPER_ADMIN') as any);

// Platform Overview & GMV Analytics
router.get('/analytics/overview', getPlatformOverview as any);

// Restaurant Tenant Directory & Moderation
router.get('/restaurants', getRestaurants as any);
router.get('/restaurants/:id', getRestaurantById as any);
router.patch('/restaurants/:id/status', updateRestaurantStatus as any);
router.patch('/restaurants/:id/plan', updateRestaurantPlan as any);

// Configurable Subscription Plans Management
router.get('/plans', getSubscriptionPlans as any);
router.post('/plans', createSubscriptionPlan as any);
router.put('/plans/:id', updateSubscriptionPlan as any);
router.delete('/plans/:id', deleteSubscriptionPlan as any);

// Administrative Security & Audit Logs
router.get('/audit-logs', getAuditLogs as any);

export default router;
