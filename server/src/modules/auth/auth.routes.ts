import { Router } from 'express';
import { login, registerRestaurant, getMe } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { loginSchema, registerRestaurantSchema } from './auth.schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/register-restaurant', authRateLimiter, validateRequest(registerRestaurantSchema), registerRestaurant);
router.get('/me', requireAuth, getMe);

export default router;
