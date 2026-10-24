import { Router } from 'express';
import {
  createPublicOrder,
  getPublicOrder,
  cancelPublicOrder
} from './order.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { createOrderSchema, cancelOrderSchema } from './order.schema.js';

const router = Router();

router.post('/restaurants/:slug/orders', validateRequest(createOrderSchema), createPublicOrder);
router.get('/restaurants/:slug/orders/:orderReference', getPublicOrder);
router.post(
  '/restaurants/:slug/orders/:orderReference/cancel',
  validateRequest(cancelOrderSchema),
  cancelPublicOrder
);

export default router;
