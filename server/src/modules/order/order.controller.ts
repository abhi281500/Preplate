import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Restaurant } from '../../models/Restaurant.js';
import { MenuItem } from '../../models/MenuItem.js';
import { Order } from '../../models/Order.js';
import { OrderStatusHistory } from '../../models/OrderStatusHistory.js';
import { Payment } from '../../models/Payment.js';
import { IdempotencyKey } from '../../models/IdempotencyKey.js';
import { env } from '../../config/env.js';
import { generateOrderReference, buildWhatsAppLink, maskPhoneNumber } from './order.utils.js';
import { NotificationService } from '../../services/notificationService.js';

export const createPublicOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const { customer, items, expectedArrivalTime, paymentMethod } = req.body;

    // 1. Fetch Restaurant
    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase(),
      status: 'ACTIVE'
    });

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: `Restaurant '${slug}' is currently inactive or not found.`
      });
      return;
    }

    const tenantId = restaurant.tenantId;

    // Idempotency check to prevent duplicate order creation on network retries
    const rawIdempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const idempotencyKey = typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim() 
      ? rawIdempotencyKey.trim() 
      : undefined;

    if (idempotencyKey) {
      const cached = await IdempotencyKey.findOne({
        tenantId,
        key: idempotencyKey
      });
      if (cached) {
        res.status(cached.statusCode).json(cached.responseBody);
        return;
      }
    }

    const arrivalDate = new Date(expectedArrivalTime);
    const now = new Date();

    // 2. Validate Arrival Time in Future
    if (arrivalDate.getTime() <= now.getTime()) {
      res.status(400).json({
        success: false,
        message: 'Expected arrival time must be in the future.'
      });
      return;
    }

    // 3. Enforce Pre-Arrival Buffer (e.g. at least 20 minutes from now)
    const bufferMinutes = restaurant.settings.orderBufferMinutes || 20;
    const minAllowedTime = new Date(now.getTime() + (bufferMinutes - 1) * 60 * 1000); // 1-min tolerance for latency
    if (arrivalDate.getTime() < minAllowedTime.getTime()) {
      res.status(400).json({
        success: false,
        message: `Orders must be placed at least ${bufferMinutes} minutes in advance (preparation buffer) before arrival to allow kitchen preparation.`
      });
      return;
    }

    // 4. Validate Operating Hours for Arrival Day
    const arrivalDayOfWeek = arrivalDate.getDay(); // 0-6
    const schedule = restaurant.operatingHours.find((h) => h.dayOfWeek === arrivalDayOfWeek);

    if (!schedule || !schedule.isOpen) {
      res.status(400).json({
        success: false,
        message: `Restaurant is closed on the selected arrival date.`
      });
      return;
    }

    const arrivalTimeString = `${String(arrivalDate.getHours()).padStart(2, '0')}:${String(
      arrivalDate.getMinutes()
    ).padStart(2, '0')}`;

    if (arrivalTimeString < schedule.openTime || arrivalTimeString > schedule.closeTime) {
      res.status(400).json({
        success: false,
        message: `Arrival time ${arrivalTimeString} is outside operating hours (${schedule.openTime} - ${schedule.closeTime}).`
      });
      return;
    }

    // 5. Query and Validate Menu Items
    const itemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const validObjectIds = itemIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    if (validObjectIds.length !== itemIds.length) {
      res.status(400).json({ success: false, message: 'One or more menu item IDs are invalid.' });
      return;
    }

    const dbMenuItems = await MenuItem.find({
      tenantId,
      _id: { $in: validObjectIds }
    });

    if (dbMenuItems.length !== itemIds.length) {
      res.status(400).json({
        success: false,
        message: 'One or more items in your cart do not exist in this restaurant.'
      });
      return;
    }

    // Map for fast retrieval
    const dbItemMap = new Map(dbMenuItems.map((item) => [item._id.toString(), item]));

    // Check Availability (Sold-Out & Portion Quota Check)
    for (const reqItem of items) {
      const dbItem = dbItemMap.get(reqItem.menuItemId)!;
      if (!dbItem.isAvailable) {
        res.status(400).json({
          success: false,
          message: `Item "${dbItem.name}" is currently sold out and cannot be ordered.`
        });
        return;
      }

      if (dbItem.trackInventory) {
        if (dbItem.availableQuantity <= 0) {
          res.status(400).json({
            success: false,
            message: `Item "${dbItem.name}" has 0 portions remaining in kitchen (Sold Out).`
          });
          return;
        }

        if (dbItem.availableQuantity < reqItem.quantity) {
          res.status(400).json({
            success: false,
            message: `Only ${dbItem.availableQuantity} portion(s) of "${dbItem.name}" available in kitchen. Cannot order ${reqItem.quantity}.`
          });
          return;
        }
      }
    }

    // 6. Backend Price Calculation & Immutable Snapshotting
    let subtotal = 0;
    const itemSnapshots = items.map((reqItem: { menuItemId: string; quantity: number }) => {
      const dbItem = dbItemMap.get(reqItem.menuItemId)!;
      const itemSubtotal = dbItem.price * reqItem.quantity;
      subtotal += itemSubtotal;

      return {
        menuItemId: dbItem._id,
        nameSnapshot: dbItem.name,
        priceSnapshot: dbItem.price,
        quantity: reqItem.quantity,
        subtotal: itemSubtotal
      };
    });

    // Check minimum order amount if set
    if (restaurant.settings.minimumOrderAmount && subtotal < restaurant.settings.minimumOrderAmount) {
      res.status(400).json({
        success: false,
        message: `Minimum order amount for this restaurant is ₹${restaurant.settings.minimumOrderAmount}. Current subtotal: ₹${subtotal}.`
      });
      return;
    }

    // 5% GST standard for restaurant services
    const taxAmount = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + taxAmount;

    // 7. Generate Unique Order Reference
    let orderReference = generateOrderReference();
    // Safety check for reference collision
    while (await Order.exists({ orderReference })) {
      orderReference = generateOrderReference();
    }

    // 8. Persist Order in PENDING_CONFIRMATION State
    const order = await Order.create({
      orderReference,
      tenantId,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        specialInstructions: customer.specialInstructions?.trim() || undefined
      },
      items: itemSnapshots,
      pricing: {
        subtotal,
        taxAmount,
        totalAmount
      },
      scheduling: {
        expectedArrivalTime: arrivalDate
      },
      status: 'PENDING_CONFIRMATION',
      payment: {
        method: paymentMethod || 'PAY_AT_RESTAURANT',
        status: 'PENDING'
      }
    });

    // 9. Record Initial Status History
    await OrderStatusHistory.create({
      orderId: order._id,
      orderReference: order.orderReference,
      tenantId,
      newStatus: 'PENDING_CONFIRMATION',
      actor: {
        role: 'CUSTOMER',
        name: customer.name.trim()
      },
      reason: 'Order request submitted by customer'
    });

    // 10. Persist dedicated Payment Record
    await Payment.create({
      tenantId,
      orderId: order._id,
      orderReference: order.orderReference,
      amount: order.pricing.totalAmount,
      currency: 'INR',
      method: paymentMethod || 'PAY_AT_RESTAURANT',
      status: 'PENDING',
      provider: paymentMethod === 'RAZORPAY_ONLINE' ? 'RAZORPAY' : 'MANUAL_CASHIER',
      idempotencyKey: idempotencyKey || undefined,
      attempts: [
        {
          timestamp: new Date(),
          status: 'PENDING',
          providerResponse: 'Awaiting customer arrival or cashier settlement'
        }
      ]
    });

    // 11. Decrement stock quantity for inventory-tracked items
    for (const reqItem of items) {
      const dbItem = dbItemMap.get(reqItem.menuItemId)!;
      if (dbItem.trackInventory) {
        dbItem.availableQuantity = Math.max(0, dbItem.availableQuantity - reqItem.quantity);
        dbItem.ordersCountToday = (dbItem.ordersCountToday || 0) + reqItem.quantity;
        if (dbItem.availableQuantity === 0) {
          dbItem.isAvailable = false;
        }
        await dbItem.save();
      }
    }

    // 12. Construct WhatsApp Assisted URL
    const whatsAppLink = buildWhatsAppLink(
      restaurant.whatsappNumber,
      restaurant.name,
      order,
      env.CLIENT_ORIGIN
    );

    // 13. Log WhatsApp deep-link generation
    await NotificationService.logClickToChat({
      tenantId,
      orderId: order._id,
      orderReference: order.orderReference,
      recipientPhone: restaurant.whatsappNumber,
      recipientRole: 'RESTAURANT',
      purpose: 'ORDER_SUBMITTED_REQUEST',
      messagePayload: `Order #${order.orderReference} request placed by ${customer.name.trim()} for ETA ${arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Total: ₹${order.pricing.totalAmount})`
    });

    const responsePayload = {
      success: true,
      message: 'Order request successfully placed and awaiting restaurant confirmation.',
      data: {
        id: order._id,
        _id: order._id,
        orderReference: order.orderReference,
        status: order.status,
        expectedArrivalTime: order.scheduling.expectedArrivalTime,
        pricing: order.pricing,
        items: order.items,
        customer: order.customer,
        payment: order.payment,
        whatsAppLink,
        trackingUrl: `/r/${slug}/order/${order.orderReference}`
      }
    };

    // Cache idempotency response if key was provided
    if (idempotencyKey) {
      try {
        await IdempotencyKey.create({
          key: idempotencyKey,
          tenantId,
          endpoint: req.originalUrl,
          statusCode: 201,
          responseBody: responsePayload
        });
      } catch (err) {
        // Safe catch on duplicate key collision
      }
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

export const getPublicOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug, orderReference } = req.params;

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase()
    }).select('tenantId name whatsappNumber settings');

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const order = await Order.findOne({
      orderReference: orderReference.toUpperCase(),
      tenantId: restaurant.tenantId
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order reference not found for this restaurant' });
      return;
    }

    const whatsAppLink = buildWhatsAppLink(
      restaurant.whatsappNumber,
      restaurant.name,
      order,
      env.CLIENT_ORIGIN
    );

    res.status(200).json({
      success: true,
      data: {
        orderReference: order.orderReference,
        status: order.status,
        rejectionReason: order.rejectionReason,
        cancellationReason: order.cancellationReason,
        customer: {
          name: order.customer.name,
          phone: maskPhoneNumber(order.customer.phone),
          specialInstructions: order.customer.specialInstructions
        },
        items: order.items,
        pricing: order.pricing,
        scheduling: order.scheduling,
        payment: order.payment,
        restaurant: {
          name: restaurant.name,
          whatsappNumber: restaurant.whatsappNumber
        },
        whatsAppLink,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPublicOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug, orderReference } = req.params;
    const { reason } = req.body;

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase()
    }).select('tenantId name');

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const order = await Order.findOne({
      orderReference: orderReference.toUpperCase(),
      tenantId: restaurant.tenantId
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Only allow cancellation while still PENDING_CONFIRMATION
    if (order.status !== 'PENDING_CONFIRMATION') {
      res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its current status is '${order.status}'. Once accepted or being prepared, cancellation must be coordinated directly with the restaurant.`
      });
      return;
    }

    order.status = 'CANCELLED';
    order.cancellationReason = reason || 'Cancelled by customer before restaurant acceptance';
    await order.save();

    // Replenish inventory for tracked items upon cancellation
    for (const itemSnapshot of order.items) {
      const dbItem = await MenuItem.findById(itemSnapshot.menuItemId);
      if (dbItem && dbItem.trackInventory) {
        dbItem.availableQuantity = (dbItem.availableQuantity || 0) + itemSnapshot.quantity;
        if (dbItem.availableQuantity > 0) {
          dbItem.isAvailable = true;
        }
        await dbItem.save();
      }
    }

    await OrderStatusHistory.create({
      orderId: order._id,
      orderReference: order.orderReference,
      tenantId: restaurant.tenantId,
      previousStatus: 'PENDING_CONFIRMATION',
      newStatus: 'CANCELLED',
      actor: {
        role: 'CUSTOMER',
        name: order.customer.name
      },
      reason: order.cancellationReason
    });

    res.status(200).json({
      success: true,
      message: 'Order successfully cancelled',
      data: {
        orderReference: order.orderReference,
        status: order.status,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (error) {
    next(error);
  }
};
