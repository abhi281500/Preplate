import { Router } from 'express';
import { login, registerRestaurant, getMe } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { loginSchema, registerRestaurantSchema } from './auth.schema.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/register-restaurant', validateRequest(registerRestaurantSchema), registerRestaurant);
router.get('/me', requireAuth, getMe);

export default router;
