import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/index.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Subscription } from '../../models/Subscription.js';
import { AuditLog } from '../../models/AuditLog.js';

// ==========================================
// 1. PLATFORM OVERVIEW & AGGREGATE METRICS
// ==========================================

export const getPlatformOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Total Restaurants & Status Breakdown
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ status: 'ACTIVE' });
    const suspendedRestaurants = await Restaurant.countDocuments({ status: 'SUSPENDED' });
    const pendingApprovalRestaurants = await Restaurant.countDocuments({ status: 'PENDING_APPROVAL' });

    // 2. Orders & GMV Metrics (Gross Merchandise Value)
    // Non-cancelled and non-rejected orders contribute to platform GMV
    const gmvAggregate = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      {
        $group: {
          _id: null,
          totalGMV: { $sum: '$pricing.totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalGMV = gmvAggregate.length > 0 ? gmvAggregate[0].totalGMV : 0;
    const totalSuccessfulOrders = gmvAggregate.length > 0 ? gmvAggregate[0].count : 0;
    const totalAllOrders = await Order.countDocuments();

    // 3. Orders by Status Breakdown
    const statusCountsAggregate = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const ordersByStatus: Record<string, number> = {
      PENDING_CONFIRMATION: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY: 0,
      SERVED: 0,
      CANCELLED: 0,
      REJECTED: 0
    };

    statusCountsAggregate.forEach((item) => {
      if (item._id && ordersByStatus[item._id] !== undefined) {
        ordersByStatus[item._id] = item.count;
      }
    });

    // 4. Subscriptions & Estimated Monthly Recurring Revenue (MRR in INR)
    const activeSubscriptions = await Subscription.find({
      status: { $in: ['ACTIVE', 'TRIAL'] }
    }).populate<{ planId: { priceINR: number; billingCycle: string; name: string; planKey: string } }>(
      'planId',
      'priceINR billingCycle name planKey'
    );

    let estimatedMRR = 0;
    const planBreakdown: Record<string, { name: string; count: number; monthlyRevenue: number }> = {};

    activeSubscriptions.forEach((sub) => {
      const plan = sub.planId;
      if (plan) {
        const monthlyCost = plan.billingCycle === 'ANNUAL' ? plan.priceINR / 12 : plan.priceINR;
        // Trial subscriptions are free for pilot
        if (sub.status === 'ACTIVE') {
          estimatedMRR += monthlyCost;
        }

        if (!planBreakdown[plan.planKey]) {
          planBreakdown[plan.planKey] = {
            name: plan.name,
            count: 0,
            monthlyRevenue: 0
          };
        }
        planBreakdown[plan.planKey].count += 1;
        if (sub.status === 'ACTIVE') {
          planBreakdown[plan.planKey].monthlyRevenue += monthlyCost;
        }
      }
    });

    // 5. Recent Cross-Platform Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderReference tenantId pricing status customer expectedArrivalTime createdAt');

    // 6. Recent Platform Audit Events
    const recentAuditLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('action actorRole resource resourceId details createdAt');

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalRestaurants,
          activeRestaurants,
          suspendedRestaurants,
          pendingApprovalRestaurants,
          totalGMV: Math.round(totalGMV * 100) / 100,
          totalSuccessfulOrders,
          totalAllOrders,
          estimatedMRR: Math.round(estimatedMRR)
        },
        ordersByStatus,
        planBreakdown,
        recentOrders,
        recentAuditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. RESTAURANT TENANT MANAGEMENT
// ==========================================

export const getRestaurants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, status } = req.query;

    const query: Record<string, any> = {};

    if (status && typeof status === 'string') {
      query.status = status;
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { tenantId: searchRegex },
        { contactPhone: searchRegex }
      ];
    }

    const restaurants = await Restaurant.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'subscriptionId',
        populate: {
          path: 'planId',
          select: 'planKey name priceINR billingCycle'
        }
      });

    // Fetch owner information & volume aggregation for each restaurant
    const tenantIds = restaurants.map((r) => r.tenantId);

    const owners = await User.find({
      tenantId: { $in: tenantIds },
      role: 'RESTAURANT_OWNER'
    }).select('name email phone tenantId status');

    const ownerMap = new Map(owners.map((o) => [o.tenantId, o]));

    // Aggregate orders and GMV per tenant
    const orderAggregates = await Order.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      {
        $group: {
          _id: '$tenantId',
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['CANCELLED', 'REJECTED']] },
                0,
                '$pricing.totalAmount'
              ]
            }
          }
        }
      }
    ]);

    const orderStatsMap = new Map(
      orderAggregates.map((item) => [
        item._id,
        {
          totalOrders: item.totalOrders,
          totalRevenue: Math.round(item.totalRevenue * 100) / 100
        }
      ])
    );

    const enriched = restaurants.map((rest) => {
      const restObj = rest.toObject();
      const owner = ownerMap.get(rest.tenantId);
      const stats = orderStatsMap.get(rest.tenantId) || { totalOrders: 0, totalRevenue: 0 };

      return {
        ...restObj,
        owner: owner
          ? {
              name: owner.name,
              email: owner.email,
              status: owner.status
            }
          : null,
        stats
      };
    });

    res.status(200).json({
      success: true,
      data: {
        restaurants: enriched,
        total: enriched.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { tenantId: id };
    const restaurant = await Restaurant.findOne(query).populate({
      path: 'subscriptionId',
      populate: {
        path: 'planId',
        select: 'planKey name priceINR billingCycle features'
      }
    });

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const owner = await User.findOne({
      tenantId: restaurant.tenantId,
      role: 'RESTAURANT_OWNER'
    }).select('name email phone status createdAt');

    const recentOrders = await Order.find({ tenantId: restaurant.tenantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderReference pricing status customer expectedArrivalTime createdAt');

    const recentAuditLogs = await AuditLog.find({ tenantId: restaurant.tenantId })
      .sort({ createdAt: -1 })
      .limit(10);

    const orderStats = await Order.aggregate([
      { $match: { tenantId: restaurant.tenantId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['CANCELLED', 'REJECTED']] },
                0,
                '$pricing.totalAmount'
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurant,
        owner,
        stats: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalRevenue: Math.round((orderStats[0]?.totalRevenue || 0) * 100) / 100
        },
        recentOrders,
        recentAuditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE, SUSPENDED, or PENDING_APPROVAL'
      });
      return;
    }

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { tenantId: id };
    const restaurant = await Restaurant.findOne(query);

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const oldStatus = restaurant.status;
    restaurant.status = status;
    await restaurant.save();

    // Create Audit Log
    await AuditLog.create({
      tenantId: restaurant.tenantId,
      userId: req.user?.userId,
      actorRole: 'SUPER_ADMIN',
      action: 'UPDATE_RESTAURANT_STATUS',
      resource: 'Restaurant',
      resourceId: restaurant._id.toString(),
      details: {
        oldStatus,
        newStatus: status,
        reason: reason || 'Super Admin manual status update'
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Restaurant status updated to ${status}`,
      data: {
        restaurantId: restaurant._id,
        tenantId: restaurant.tenantId,
        status: restaurant.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { planId, status = 'ACTIVE', trialDays } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { tenantId: id };
    const restaurant = await Restaurant.findOne(query);

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const targetPlan = await SubscriptionPlan.findById(planId);
    if (!targetPlan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    let trialEndsAt: Date | undefined;
    if (trialDays && typeof trialDays === 'number' && trialDays > 0) {
      trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    }

    // Upsert tenant Subscription
    const subscription = await Subscription.findOneAndUpdate(
      { tenantId: restaurant.tenantId },
      {
        tenantId: restaurant.tenantId,
        planId: targetPlan._id,
        status,
        ...(trialEndsAt ? { trialEndsAt } : {}),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    restaurant.subscriptionId = subscription._id as mongoose.Types.ObjectId;
    await restaurant.save();

    // Log Action
    await AuditLog.create({
      tenantId: restaurant.tenantId,
      userId: req.user?.userId,
      actorRole: 'SUPER_ADMIN',
      action: 'ASSIGN_SUBSCRIPTION_PLAN',
      resource: 'Subscription',
      resourceId: subscription._id.toString(),
      details: {
        planKey: targetPlan.planKey,
        planName: targetPlan.name,
        priceINR: targetPlan.priceINR,
        status
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Subscription plan ${targetPlan.name} assigned successfully`,
      data: {
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. SUBSCRIPTION PLAN CONFIGURATOR
// ==========================================

export const getSubscriptionPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find().sort({ priceINR: 1 });

    // Aggregate active tenant subscriber counts per plan
    const subscriberCounts = await Subscription.aggregate([
      {
        $match: {
          status: { $in: ['ACTIVE', 'TRIAL'] }
        }
      },
      {
        $group: {
          _id: '$planId',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = new Map(subscriberCounts.map((s) => [s._id.toString(), s.count]));

    const enriched = plans.map((plan) => {
      const planObj = plan.toObject();
      return {
        ...planObj,
        activeSubscribers: countMap.get(plan._id.toString()) || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        plans: enriched
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createSubscriptionPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planKey, name, description, priceINR, billingCycle = 'MONTHLY', features, isActive = true } = req.body;

    if (!planKey || !name || priceINR === undefined || priceINR < 0) {
      res.status(400).json({
        success: false,
        message: 'Plan key, name, and valid price in INR are required.'
      });
      return;
    }

    const cleanKey = planKey.trim().toUpperCase();

    const existing = await SubscriptionPlan.findOne({ planKey: cleanKey });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `Plan key '${cleanKey}' already exists. Please choose a unique key.`
      });
      return;
    }

    const newPlan = await SubscriptionPlan.create({
      planKey: cleanKey,
      name: name.trim(),
      description: description?.trim(),
      priceINR: Number(priceINR),
      billingCycle,
      features: {
        maxMenuItems: features?.maxMenuItems || 50,
        maxStaffAccounts: features?.maxStaffAccounts || 3,
        analyticsAccess: Boolean(features?.analyticsAccess),
        prioritySupport: Boolean(features?.prioritySupport)
      },
      isActive: Boolean(isActive)
    });

    await AuditLog.create({
      userId: req.user?.userId,
      actorRole: 'SUPER_ADMIN',
      action: 'CREATE_SUBSCRIPTION_PLAN',
      resource: 'SubscriptionPlan',
      resourceId: newPlan._id.toString(),
      details: {
        planKey: newPlan.planKey,
        name: newPlan.name,
        priceINR: newPlan.priceINR
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: { plan: newPlan }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, priceINR, billingCycle, features, isActive } = req.body;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    if (name) plan.name = name.trim();
    if (description !== undefined) plan.description = description.trim();
    if (priceINR !== undefined) plan.priceINR = Number(priceINR);
    if (billingCycle) plan.billingCycle = billingCycle;
    if (isActive !== undefined) plan.isActive = Boolean(isActive);

    if (features) {
      if (features.maxMenuItems !== undefined) plan.features.maxMenuItems = features.maxMenuItems;
      if (features.maxStaffAccounts !== undefined) plan.features.maxStaffAccounts = features.maxStaffAccounts;
      if (features.analyticsAccess !== undefined) plan.features.analyticsAccess = Boolean(features.analyticsAccess);
      if (features.prioritySupport !== undefined) plan.features.prioritySupport = Boolean(features.prioritySupport);
    }

    await plan.save();

    await AuditLog.create({
      userId: req.user?.userId,
      actorRole: 'SUPER_ADMIN',
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      resource: 'SubscriptionPlan',
      resourceId: plan._id.toString(),
      details: {
        planKey: plan.planKey,
        name: plan.name,
        priceINR: plan.priceINR,
        isActive: plan.isActive
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscriptionPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    // Soft-deactivate to maintain integrity with existing subscriptions
    plan.isActive = false;
    await plan.save();

    await AuditLog.create({
      userId: req.user?.userId,
      actorRole: 'SUPER_ADMIN',
      action: 'ARCHIVE_SUBSCRIPTION_PLAN',
      resource: 'SubscriptionPlan',
      resourceId: plan._id.toString(),
      details: { planKey: plan.planKey, name: plan.name },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Subscription plan archived (deactivated) successfully',
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. PLATFORM AUDIT LOGS
// ==========================================

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const action = req.query.action as string;

    const filter: Record<string, any> = {};
    if (action) {
      filter.action = action;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email role');

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};
