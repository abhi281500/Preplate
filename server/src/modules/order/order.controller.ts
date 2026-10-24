import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Restaurant } from '../../models/Restaurant.js';
import { MenuItem } from '../../models/MenuItem.js';
import { Order } from '../../models/Order.js';
import { OrderStatusHistory } from '../../models/OrderStatusHistory.js';
import { env } from '../../config/env.js';
import { generateOrderReference, buildWhatsAppLink } from './order.utils.js';

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

    // Check Availability (Sold-Out Check)
    for (const reqItem of items) {
      const dbItem = dbItemMap.get(reqItem.menuItemId)!;
      if (!dbItem.isAvailable) {
        res.status(400).json({
          success: false,
          message: `Item "${dbItem.name}" is currently sold out and cannot be ordered.`
        });
        return;
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

    // 10. Construct WhatsApp Assisted URL
    const whatsAppLink = buildWhatsAppLink(
      restaurant.whatsappNumber,
      restaurant.name,
      order,
      env.CLIENT_ORIGIN
    );

    res.status(201).json({
      success: true,
      message: 'Order request successfully placed and awaiting restaurant confirmation.',
      data: {
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
    });
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
        customer: order.customer,
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
