import { Request, Response, NextFunction } from 'express';
import { Restaurant, IOperatingHour } from '../../models/Restaurant.js';
import { Category } from '../../models/Category.js';
import { MenuItem } from '../../models/MenuItem.js';

function computeOperatingStatus(operatingHours: IOperatingHour[]): {
  isOpenNow: boolean;
  todaySchedule?: IOperatingHour;
} {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  const todaySchedule = operatingHours.find((h) => h.dayOfWeek === currentDay);

  if (!todaySchedule || !todaySchedule.isOpen) {
    return { isOpenNow: false, todaySchedule };
  }

  const isOpenNow =
    currentTimeString >= todaySchedule.openTime && currentTimeString <= todaySchedule.closeTime;

  return { isOpenNow, todaySchedule };
}

export const getPublicRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('name slug tagline contactPhone whatsappNumber address operatingHours settings status');

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: `Restaurant '${slug}' not found or currently not accepting online orders.`
      });
      return;
    }

    const { isOpenNow, todaySchedule } = computeOperatingStatus(restaurant.operatingHours);

    res.status(200).json({
      success: true,
      data: {
        name: restaurant.name,
        slug: restaurant.slug,
        tagline: restaurant.tagline,
        contactPhone: restaurant.contactPhone,
        whatsappNumber: restaurant.whatsappNumber,
        address: restaurant.address,
        operatingHours: restaurant.operatingHours,
        settings: {
          orderBufferMinutes: restaurant.settings.orderBufferMinutes,
          currency: restaurant.settings.currency,
          allowPayAtRestaurant: restaurant.settings.allowPayAtRestaurant,
          minimumOrderAmount: restaurant.settings.minimumOrderAmount,
          upiId: restaurant.settings.upiId
        },
        isOpenNow,
        todaySchedule
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('tenantId name slug settings');

    if (!restaurant) {
      res.status(404).json({ success: false, message: `Restaurant '${slug}' not found` });
      return;
    }

    const tenantId = restaurant.tenantId;

    // Fetch active categories
    const categories = await Category.find({
      tenantId,
      isActive: true
    }).sort({ displayOrder: 1, createdAt: 1 });

    // Fetch all menu items for this restaurant
    const menuItems = await MenuItem.find({ tenantId })
      .select('name description price isVeg prepTimeEstimateMinutes isAvailable trackInventory availableQuantity dailyStockLimit imageUrl categoryId displayOrder')
      .sort({ displayOrder: 1, createdAt: 1 });

    // Group items under active categories
    const categoryMap = new Map<string, any>();
    for (const cat of categories) {
      categoryMap.set(cat._id.toString(), {
        id: cat._id.toString(),
        name: cat.name,
        description: cat.description,
        items: []
      });
    }

    for (const item of menuItems) {
      const catGroup = categoryMap.get(item.categoryId.toString());
      if (catGroup) {
        catGroup.items.push({
          id: item._id.toString(),
          name: item.name,
          description: item.description,
          price: item.price,
          isVeg: item.isVeg,
          prepTimeEstimateMinutes: item.prepTimeEstimateMinutes,
          isAvailable: item.isAvailable && (!item.trackInventory || (item.availableQuantity ?? 0) > 0),
          trackInventory: item.trackInventory ?? false,
          availableQuantity: item.availableQuantity ?? 0,
          imageUrl: item.imageUrl
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        restaurant: {
          name: restaurant.name,
          slug: restaurant.slug,
          settings: restaurant.settings
        },
        categories: Array.from(categoryMap.values())
      }
    });
  } catch (error) {
    next(error);
  }
};
