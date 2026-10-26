import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { correlationIdMiddleware } from './middleware/requestId.js';
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurant/restaurant.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import orderManagementRoutes from './modules/restaurant/orderManagement.routes.js';
import {
  restaurantNotificationRouter,
  webhookRouter
} from './modules/notification/notification.routes.js';
import superRoutes from './modules/super/super.routes.js';

export const createApp = (customRoutes?: { path: string; router: express.Router }[]) => {
  const app = express();

  // Attach correlation ID to all incoming requests
  app.use(correlationIdMiddleware);

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    })
  );

  // Body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // HTTP request logging in development
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'Preplate API',
      requestId: req.id,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  });

  // API v1 Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/public', publicRoutes);
  apiRouter.use('/public', orderRoutes);
  apiRouter.use('/restaurant', restaurantRoutes);
  apiRouter.use('/restaurant', menuRoutes);
  apiRouter.use('/restaurant', orderManagementRoutes);
  apiRouter.use('/restaurant/notifications', restaurantNotificationRouter);
  apiRouter.use('/webhook', webhookRouter);
  apiRouter.use('/super', superRoutes);

  if (customRoutes) {
    for (const route of customRoutes) {
      apiRouter.use(route.path, route.router);
    }
  }

  app.use(env.API_PREFIX, apiRouter);

  // 404 handler for unknown routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
