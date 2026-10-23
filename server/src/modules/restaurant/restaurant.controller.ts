import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { Restaurant } from '../../models/Restaurant.js';
import { AuditLog } from '../../models/AuditLog.js';

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findOne({ tenantId: req.tenantId });
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updates = req.body;

    const restaurant = await Restaurant.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    // Log the profile update
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user?.userId,
      actorRole: req.user?.role || 'UNKNOWN',
      action: 'RESTAURANT_PROFILE_UPDATED',
      resource: 'Restaurant',
      resourceId: restaurant._id.toString(),
      details: { updatedFields: Object.keys(updates) }
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant profile successfully updated',
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};
