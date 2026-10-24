import { Router } from 'express';
import {
  getNotificationLogs,
  getNotificationSettings,
  updateNotificationSettings,
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook
} from './notification.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { enforceTenantContext } from '../../middleware/tenantContext.js';

// Restaurant Operator Notification Routes
export const restaurantNotificationRouter = Router();
restaurantNotificationRouter.use(requireAuth, enforceTenantContext);

restaurantNotificationRouter.get('/', getNotificationLogs);
restaurantNotificationRouter.get('/settings', getNotificationSettings);
restaurantNotificationRouter.put(
  '/settings',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  updateNotificationSettings
);

// Meta Cloud API Webhook Routes (Public)
export const webhookRouter = Router();
webhookRouter.get('/whatsapp', verifyWhatsAppWebhook);
webhookRouter.post('/whatsapp', handleWhatsAppWebhook);
