import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { User } from '../../models/User.js';
import { Restaurant } from '../../models/Restaurant.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AuthenticatedRequest } from '../../types/index.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is deactivated. Contact platform administrator.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // If restaurant user, check restaurant status
    let restaurantInfo = null;
    if (user.tenantId) {
      const restaurant = await Restaurant.findOne({ tenantId: user.tenantId });
      if (restaurant) {
        if (restaurant.status === 'SUSPENDED') {
          res.status(403).json({ success: false, message: 'Restaurant account has been suspended by SaaS administration.' });
          return;
        }
        restaurantInfo = {
          tenantId: restaurant.tenantId,
          name: restaurant.name,
          slug: restaurant.slug,
          status: restaurant.status
        };
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          permissions: user.permissions
        },
        restaurant: restaurantInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerRestaurant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { restaurantName, slug, contactPhone, whatsappNumber, ownerName, email, password } = req.body;

    // Check if slug or email is already taken
    const [existingSlug, existingEmail] = await Promise.all([
      Restaurant.findOne({ slug: slug.toLowerCase() }),
      User.findOne({ email: email.toLowerCase() })
    ]);

    if (existingSlug) {
      res.status(409).json({ success: false, message: 'This restaurant URL slug is already registered. Please choose another.' });
      return;
    }

    if (existingEmail) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }

    // Generate unique tenantId
    const tenantId = `tenant_${crypto.randomBytes(6).toString('hex')}`;

    // Create restaurant
    const restaurant = await Restaurant.create({
      tenantId,
      name: restaurantName,
      slug: slug.toLowerCase(),
      contactPhone,
      whatsappNumber,
      status: 'ACTIVE' // Active for initial pilot onboarding
    });

    // Hash password & create owner user
    const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      tenantId,
      name: ownerName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'RESTAURANT_OWNER',
      status: 'ACTIVE'
    });

    // Record audit log
    await AuditLog.create({
      tenantId,
      userId: user._id,
      actorRole: 'RESTAURANT_OWNER',
      action: 'RESTAURANT_ONBOARDED',
      resource: 'Restaurant',
      resourceId: restaurant._id.toString(),
      details: { slug: restaurant.slug, name: restaurant.name }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      success: true,
      message: 'Restaurant successfully registered and onboarded',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          permissions: user.permissions
        },
        restaurant: {
          tenantId: restaurant.tenantId,
          name: restaurant.name,
          slug: restaurant.slug,
          status: restaurant.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    let restaurant = null;
    if (user.tenantId) {
      restaurant = await Restaurant.findOne({ tenantId: user.tenantId });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        restaurant
      }
    });
  } catch (error) {
    next(error);
  }
};
