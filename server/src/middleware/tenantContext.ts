import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Restaurant } from '../models/Restaurant.js';

/**
 * Enforces strict tenant scoping for restaurant operator endpoints.
 * Guarantees that restaurant owners and staff can only access data belonging to their own tenantId.
 */
export const enforceTenantContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Super Admins have platform-level access; they can optionally supply a tenant query
  if (req.user.role === 'SUPER_ADMIN') {
    const requestedTenant = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string);
    if (requestedTenant) {
      req.tenantId = requestedTenant;
    }
    next();
    return;
  }

  // Restaurant users MUST have a verified tenantId
  if (!req.user.tenantId) {
    res.status(403).json({ success: false, message: 'Access denied: User is not linked to any restaurant tenant' });
    return;
  }

  // Check if client tried to spoof or manipulate tenantId in headers or query
  const untrustedTenant = req.headers['x-tenant-id'] as string;
  if (untrustedTenant && untrustedTenant !== req.user.tenantId) {
    res.status(403).json({ success: false, message: 'Cross-tenant access violation detected' });
    return;
  }

  // Verify that the restaurant account is not suspended
  const restaurant = await Restaurant.findOne({ tenantId: req.user.tenantId }).select('status');
  if (!restaurant) {
    res.status(404).json({ success: false, message: 'Associated restaurant tenant not found' });
    return;
  }

  if (restaurant.status === 'SUSPENDED') {
    res.status(403).json({
      success: false,
      message: 'Restaurant account is suspended. Please contact platform administration.'
    });
    return;
  }

  // Pin authenticated tenantId to request context
  req.tenantId = req.user.tenantId;
  next();
};
