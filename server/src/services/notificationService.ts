import { NotificationLog, NotificationPurpose, NotificationDeliveryState } from '../models/NotificationLog.js';
import { env } from '../config/env.js';

export interface CreateNotificationParams {
  tenantId: string;
  orderId?: any;
  orderReference: string;
  recipientPhone: string;
  recipientRole: 'RESTAURANT' | 'CUSTOMER';
  purpose: NotificationPurpose;
  messagePayload: string;
}

export class NotificationService {
  /**
   * Logs a generated Click-to-WhatsApp deep link for auditability and delivery transparency.
   */
  static async logClickToChat(params: CreateNotificationParams): Promise<void> {
    try {
      await NotificationLog.create({
        tenantId: params.tenantId,
        orderId: params.orderId,
        orderReference: params.orderReference,
        recipientPhone: params.recipientPhone,
        recipientRole: params.recipientRole,
        channel: 'WHATSAPP_CLICK_TO_CHAT',
        purpose: params.purpose,
        deliveryState: 'PREFILLED_LINK_GENERATED',
        messagePayload: params.messagePayload,
        attemptCount: 1
      });
    } catch (error) {
      console.error('Failed to log click-to-chat notification:', error);
    }
  }

  /**
   * Dispatches automated template message via Meta WhatsApp Cloud API (when credentials are provided).
   */
  static async dispatchCloudApiNotification(
    params: CreateNotificationParams & { templateName?: string }
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v20.0';

    if (!phoneNumberId || !accessToken) {
      // Graceful fallback when Cloud API is not yet provisioned with Meta credentials
      await NotificationLog.create({
        tenantId: params.tenantId,
        orderId: params.orderId,
        orderReference: params.orderReference,
        recipientPhone: params.recipientPhone,
        recipientRole: params.recipientRole,
        channel: 'WHATSAPP_CLOUD_API',
        purpose: params.purpose,
        deliveryState: 'FAILED',
        messagePayload: params.messagePayload,
        errorDetails: 'WhatsApp Cloud API credentials not configured in environment. Click-to-WhatsApp MVP mode active.'
      });

      return {
        success: false,
        error: 'WhatsApp Cloud API credentials not configured in environment. Using Click-to-WhatsApp mode.'
      };
    }

    try {
      const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, '');

      // In production, Meta requires registered template names or standard text within 24h customer window
      const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: params.messagePayload
          }
        })
      });

      const data: any = await response.json();
      const messageId = data?.messages?.[0]?.id;

      await NotificationLog.create({
        tenantId: params.tenantId,
        orderId: params.orderId,
        orderReference: params.orderReference,
        recipientPhone: params.recipientPhone,
        recipientRole: params.recipientRole,
        channel: 'WHATSAPP_CLOUD_API',
        purpose: params.purpose,
        deliveryState: 'DISPATCHED',
        messagePayload: params.messagePayload,
        providerMessageId: messageId
      });

      return { success: true, providerMessageId: messageId };
    } catch (err: any) {
      const errorMsg = err.message || 'WhatsApp Cloud API dispatch failed';

      await NotificationLog.create({
        tenantId: params.tenantId,
        orderId: params.orderId,
        orderReference: params.orderReference,
        recipientPhone: params.recipientPhone,
        recipientRole: params.recipientRole,
        channel: 'WHATSAPP_CLOUD_API',
        purpose: params.purpose,
        deliveryState: 'FAILED',
        messagePayload: params.messagePayload,
        errorDetails: errorMsg
      });

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Processes inbound WhatsApp delivery status updates (sent, delivered, read, failed) from Meta webhooks.
   */
  static async handleWebhookStatus(statusEvent: {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    errors?: any[];
  }): Promise<void> {
    const stateMap: Record<string, NotificationDeliveryState> = {
      sent: 'DISPATCHED',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED'
    };

    const targetState = stateMap[statusEvent.status];
    if (!targetState) return;

    await NotificationLog.findOneAndUpdate(
      { providerMessageId: statusEvent.id },
      {
        $set: {
          deliveryState: targetState,
          ...(statusEvent.errors ? { errorDetails: JSON.stringify(statusEvent.errors) } : {})
        }
      }
    );
  }
}
