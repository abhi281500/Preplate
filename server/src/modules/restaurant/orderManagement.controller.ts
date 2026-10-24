import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/index.js';
import { Order, OrderStatus } from '../../models/Order.js';
import { OrderStatusHistory } from '../../models/OrderStatusHistory.js';
import { NotificationService } from '../../services/notificationService.js';

// Permitted progressive status transitions
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: []
};

export const getRestaurantOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { statusFilter } = req.query; // 'PENDING' | 'ACTIVE' | 'HISTORY' | 'ALL'

    const filter: Record<string, unknown> = { tenantId: req.tenantId };

    if (statusFilter === 'PENDING') {
      filter.status = 'PENDING_CONFIRMATION';
    } else if (statusFilter === 'ACTIVE') {
      filter.status = { $in: ['ACCEPTED', 'PREPARING', 'READY'] };
    } else if (statusFilter === 'HISTORY') {
      filter.status = { $in: ['SERVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] };
    }

    const sortOption: Record<string, 1 | -1> =
      statusFilter === 'PENDING' || statusFilter === 'ACTIVE'
        ? { 'scheduling.expectedArrivalTime': 1 }
        : { createdAt: -1 };

    const orders = await Order.find(filter).sort(sortOption).limit(100);

    // Compute live queue summary counts for dashboard header badges
    const [pendingCount, acceptedCount, preparingCount, readyCount] = await Promise.all([
      Order.countDocuments({ tenantId: req.tenantId, status: 'PENDING_CONFIRMATION' }),
      Order.countDocuments({ tenantId: req.tenantId, status: 'ACCEPTED' }),
      Order.countDocuments({ tenantId: req.tenantId, status: 'PREPARING' }),
      Order.countDocuments({ tenantId: req.tenantId, status: 'READY' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        queueSummary: {
          pendingCount,
          acceptedCount,
          preparingCount,
          readyCount,
          totalActive: acceptedCount + preparingCount + readyCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID format' });
      return;
    }

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const timeline = await OrderStatusHistory.find({
      orderId: order._id,
      tenantId: req.tenantId
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        order,
        timeline
      }
    });
  } catch (error) {
    next(error);
  }
};

export const acceptOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { prepDurationMinutes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID format' });
      return;
    }

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING_CONFIRMATION') {
      res.status(400).json({
        success: false,
        message: `Cannot accept order: Current status is '${order.status}'. Only PENDING_CONFIRMATION orders can be accepted.`
      });
      return;
    }

    const acceptedAt = new Date();
    const estimatedReadyTime = new Date(acceptedAt.getTime() + prepDurationMinutes * 60 * 1000);

    order.status = 'ACCEPTED';
    order.scheduling.acceptedAt = acceptedAt;
    order.scheduling.estimatedReadyTime = estimatedReadyTime;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      orderReference: order.orderReference,
      tenantId: req.tenantId,
      previousStatus: 'PENDING_CONFIRMATION',
      newStatus: 'ACCEPTED',
      actor: {
        userId: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        role: req.user?.role || 'RESTAURANT_STAFF',
        name: req.user?.name || 'Staff'
      },
      reason: `Order accepted with ~${prepDurationMinutes} mins estimated prep duration`
    });

    await NotificationService.logClickToChat({
      tenantId: req.tenantId!,
      orderId: order._id,
      orderReference: order.orderReference,
      recipientPhone: order.customer.phone,
      recipientRole: 'CUSTOMER',
      purpose: 'ORDER_ACCEPTED_ALERT',
      messagePayload: `Your order #${order.orderReference} was accepted. Estimated ready time: ${estimatedReadyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    });

    res.status(200).json({
      success: true,
      message: `Order #${order.orderReference} accepted. Ready estimate: ${estimatedReadyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const rejectOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID format' });
      return;
    }

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING_CONFIRMATION') {
      res.status(400).json({
        success: false,
        message: `Cannot reject order: Current status is '${order.status}'. Only PENDING_CONFIRMATION orders can be rejected.`
      });
      return;
    }

    order.status = 'REJECTED';
    order.rejectionReason = reason;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      orderReference: order.orderReference,
      tenantId: req.tenantId,
      previousStatus: 'PENDING_CONFIRMATION',
      newStatus: 'REJECTED',
      actor: {
        userId: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        role: req.user?.role || 'RESTAURANT_STAFF',
        name: req.user?.name || 'Staff'
      },
      reason
    });

    await NotificationService.logClickToChat({
      tenantId: req.tenantId!,
      orderId: order._id,
      orderReference: order.orderReference,
      recipientPhone: order.customer.phone,
      recipientRole: 'CUSTOMER',
      purpose: 'ORDER_REJECTED_ALERT',
      messagePayload: `Your order #${order.orderReference} was declined by the restaurant: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: `Order #${order.orderReference} rejected`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nextStatus } = req.body as { nextStatus: OrderStatus };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID format' });
      return;
    }

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(nextStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition: Cannot advance order from '${order.status}' directly to '${nextStatus}'. Permitted transitions: [${allowed?.join(', ') || 'none'}].`
      });
      return;
    }

    const previousStatus = order.status;
    order.status = nextStatus;

    if (nextStatus === 'READY') {
      order.scheduling.actualReadyTime = new Date();
    } else if (nextStatus === 'SERVED') {
      order.scheduling.servedAt = new Date();
      // If paying at restaurant, mark payment status as PAID upon food handover
      if (order.payment.method === 'PAY_AT_RESTAURANT' || order.payment.method === 'UPI_ON_ARRIVAL') {
        order.payment.status = 'PAID';
      }
    }

    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      orderReference: order.orderReference,
      tenantId: req.tenantId,
      previousStatus,
      newStatus: nextStatus,
      actor: {
        userId: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        role: req.user?.role || 'RESTAURANT_STAFF',
        name: req.user?.name || 'Staff'
      },
      reason: `Status advanced to ${nextStatus}`
    });

    if (nextStatus === 'READY') {
      await NotificationService.logClickToChat({
        tenantId: req.tenantId!,
        orderId: order._id,
        orderReference: order.orderReference,
        recipientPhone: order.customer.phone,
        recipientRole: 'CUSTOMER',
        purpose: 'ORDER_READY_ALERT',
        messagePayload: `Your order #${order.orderReference} is ready! Please collect your food at the counter.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Order #${order.orderReference} status updated to ${nextStatus}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    const allOrders = await Order.find({ tenantId });
    const totalOrders = allOrders.length;

    let totalServedRevenue = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;
    let servedCount = 0;
    let totalPrepMinutes = 0;
    let completedWithPrepTimeCount = 0;

    for (const order of allOrders) {
      if (order.status === 'SERVED') {
        servedCount++;
        totalServedRevenue += order.pricing.totalAmount;
        if (order.scheduling.acceptedAt && order.scheduling.actualReadyTime) {
          const diffMinutes =
            (new Date(order.scheduling.actualReadyTime).getTime() -
              new Date(order.scheduling.acceptedAt).getTime()) /
            (1000 * 60);
          if (diffMinutes > 0) {
            totalPrepMinutes += diffMinutes;
            completedWithPrepTimeCount++;
          }
        }
      } else if (order.status === 'REJECTED') {
        rejectedCount++;
      } else if (order.status === 'CANCELLED') {
        cancelledCount++;
      } else if (['ACCEPTED', 'PREPARING', 'READY'].includes(order.status)) {
        acceptedCount++;
      }
    }

    const acceptedOverall = acceptedCount + servedCount;
    const acceptanceRate =
      totalOrders > 0 ? Math.round((acceptedOverall / totalOrders) * 100) : 100;
    const avgPrepMinutes =
      completedWithPrepTimeCount > 0
        ? Math.round(totalPrepMinutes / completedWithPrepTimeCount)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        activeOrders: acceptedCount,
        servedOrders: servedCount,
        rejectedOrders: rejectedCount,
        cancelledOrders: cancelledCount,
        acceptanceRate,
        avgPrepMinutes,
        totalServedRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
