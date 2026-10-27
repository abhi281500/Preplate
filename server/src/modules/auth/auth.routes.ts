import { Router } from 'express';
import { login, registerRestaurant, getMe, sendOtp, verifyOtp } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { loginSchema, registerRestaurantSchema, sendOtpSchema, verifyOtpSchema } from './auth.schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/register-restaurant', authRateLimiter, validateRequest(registerRestaurantSchema), registerRestaurant);
router.post('/otp/send', authRateLimiter, validateRequest(sendOtpSchema), sendOtp);
router.post('/otp/verify', authRateLimiter, validateRequest(verifyOtpSchema), verifyOtp);
router.get('/me', requireAuth, getMe);

export default router;
