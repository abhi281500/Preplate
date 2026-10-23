import { Router } from 'express';
import { getProfile, updateProfile } from './restaurant.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { enforceTenantContext } from '../../middleware/tenantContext.js';
import { validateRequest } from '../../middleware/validate.js';
import { updateRestaurantProfileSchema } from './restaurant.schema.js';

const router = Router();

// Apply auth & tenant scoping across all restaurant management routes
router.use(requireAuth, enforceTenantContext);

router.get('/profile', getProfile);
router.put(
  '/profile',
  requireRole('RESTAURANT_OWNER', 'SUPER_ADMIN'),
  validateRequest(updateRestaurantProfileSchema),
  updateProfile
);

export default router;
