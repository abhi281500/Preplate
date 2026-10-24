import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { NotificationLog } from '../../models/NotificationLog.js';
import { Restaurant } from '../../models/Restaurant.js';
import { NotificationService } from '../../services/notificationService.js';

export const getNotificationLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await NotificationLog.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(50);

    const summary = {
      totalLogged: await NotificationLog.countDocuments({ tenantId: req.tenantId }),
      clickToChatCount: await NotificationLog.countDocuments({
        tenantId: req.tenantId,
        channel: 'WHATSAPP_CLICK_TO_CHAT'
      }),
      cloudApiCount: await NotificationLog.countDocuments({
        tenantId: req.tenantId,
        channel: 'WHATSAPP_CLOUD_API'
      })
    };

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findOne({ tenantId: req.tenantId }).select(
      'name whatsappNumber contactPhone settings'
    );

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const hasCloudApiConfig = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );

    res.status(200).json({
      success: true,
      data: {
        whatsappNumber: restaurant.whatsappNumber,
        activeChannelMode: hasCloudApiConfig ? 'WHATSAPP_CLOUD_API' : 'WHATSAPP_CLICK_TO_CHAT',
        isCloudApiConfigured: hasCloudApiConfig,
        channelFeatures: {
          clickToChat: {
            available: true,
            status: 'ACTIVE_DEFAULT',
            description: 'Direct deep-link generated with pre-filled items, customer context, and tracking URL.'
          },
          cloudApi: {
            available: hasCloudApiConfig,
            status: hasCloudApiConfig ? 'CONFIGURED' : 'PENDING_CREDENTIALS',
            description: 'Automated direct server-to-server outbound messaging via Meta Graph API v20.0.'
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { whatsappNumber } = req.body;

    if (!whatsappNumber || whatsappNumber.trim().length < 8) {
      res.status(400).json({ success: false, message: 'Valid WhatsApp number is required' });
      return;
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: { whatsappNumber: whatsappNumber.trim() } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'WhatsApp notification number successfully updated',
      data: {
        whatsappNumber: restaurant?.whatsappNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// META WHATSAPP WEBHOOK HANDLERS
// ==========================================

export const verifyWhatsAppWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'preplate_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

export const handleWhatsAppWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body;

    // Acknowledge Meta within 20 seconds to prevent retry storms
    res.status(200).json({ status: 'received' });

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value?.statuses) {
            for (const status of value.statuses) {
              await NotificationService.handleWebhookStatus(status);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp Webhook Processing Error:', error);
  }
};
