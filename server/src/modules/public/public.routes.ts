import { Router } from 'express';
import { getPublicRestaurant, getPublicMenu } from './public.controller.js';

const router = Router();

router.get('/restaurants/:slug', getPublicRestaurant);
router.get('/restaurants/:slug/menu', getPublicMenu);

export default router;
