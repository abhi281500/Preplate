import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/index.js';
import { Category } from '../../models/Category.js';
import { MenuItem } from '../../models/MenuItem.js';
import { AuditLog } from '../../models/AuditLog.js';

// ==========================================
// CATEGORY HANDLERS
// ==========================================

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.find({ tenantId: req.tenantId }).sort({ displayOrder: 1, createdAt: 1 });

    // Count items per category
    const itemCounts = await MenuItem.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(itemCounts.map((c) => [c._id.toString(), c.count]));

    const result = categories.map((cat) => ({
      ...cat.toObject(),
      itemCount: countMap.get(cat._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, displayOrder, isActive } = req.body;

    const existing = await Category.findOne({ tenantId: req.tenantId, name: name.trim() });
    if (existing) {
      res.status(409).json({ success: false, message: `Category '${name}' already exists in your menu` });
      return;
    }

    const category = await Category.create({
      tenantId: req.tenantId,
      name: name.trim(),
      description,
      displayOrder: displayOrder ?? 0,
      isActive: isActive ?? true
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid category ID format' });
      return;
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found or access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid category ID format' });
      return;
    }

    // Check if any menu items are assigned to this category
    const linkedItemCount = await MenuItem.countDocuments({
      categoryId: id,
      tenantId: req.tenantId
    });

    if (linkedItemCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category: ${linkedItemCount} food item(s) are currently assigned to it. Please reassign or delete those items first.`
      });
      return;
    }

    const deleted = await Category.findOneAndDelete({ _id: id, tenantId: req.tenantId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Category not found or access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MENU ITEM HANDLERS
// ==========================================

export const getMenuItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { categoryId, isAvailable } = req.query;

    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId as string)) {
      filter.categoryId = categoryId;
    }
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    const items = await MenuItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ displayOrder: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      isVeg,
      prepTimeEstimateMinutes,
      isAvailable,
      imageUrl,
      displayOrder
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({ success: false, message: 'Invalid category ID' });
      return;
    }

    // Verify category belongs to the authenticated tenant!
    const category = await Category.findOne({ _id: categoryId, tenantId: req.tenantId });
    if (!category) {
      res.status(400).json({
        success: false,
        message: 'Invalid category: Selected category does not exist in your restaurant'
      });
      return;
    }

    const item = await MenuItem.create({
      tenantId: req.tenantId,
      categoryId,
      name: name.trim(),
      description,
      price,
      isVeg: isVeg ?? true,
      prepTimeEstimateMinutes: prepTimeEstimateMinutes ?? 15,
      isAvailable: isAvailable ?? true,
      imageUrl: imageUrl || undefined,
      displayOrder: displayOrder ?? 0
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid item ID' });
      return;
    }

    // If categoryId is being changed, verify it belongs to this tenant
    if (updates.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(updates.categoryId)) {
        res.status(400).json({ success: false, message: 'Invalid category ID' });
        return;
      }
      const category = await Category.findOne({ _id: updates.categoryId, tenantId: req.tenantId });
      if (!category) {
        res.status(400).json({ success: false, message: 'Target category does not exist in your restaurant' });
        return;
      }
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found or access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid item ID' });
      return;
    }

    const deleted = await MenuItem.findOneAndDelete({ _id: id, tenantId: req.tenantId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Menu item not found or access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1-Click Sold Out / In-Stock toggle for kitchen staff & owners.
 */
export const toggleAvailability = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid item ID' });
      return;
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { $set: { isAvailable } },
      { new: true }
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found or access denied' });
      return;
    }

    // Log the availability change for operational audit
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user?.userId,
      actorRole: req.user?.role || 'STAFF',
      action: isAvailable ? 'ITEM_MARKED_AVAILABLE' : 'ITEM_MARKED_SOLD_OUT',
      resource: 'MenuItem',
      resourceId: item._id.toString(),
      details: { itemName: item.name, isAvailable }
    });

    res.status(200).json({
      success: true,
      message: `Item '${item.name}' marked ${isAvailable ? 'Available' : 'Sold Out'}`,
      data: item
    });
  } catch (error) {
    next(error);
  }
};
