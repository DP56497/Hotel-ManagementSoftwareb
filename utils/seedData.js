import Analytics from '../models/analyticsModel.js';
import Inventory from '../models/inventoryModel.js';
import MenuItem from '../models/menuItemModel.js';
import User from '../models/userModel.js';
import { hashPassword } from './auth.js';
import { seedMenuItems } from './menuSeedList.js';

export const seedInitialData = async () => {
  try {
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      await MenuItem.insertMany(seedMenuItems);
    }

    const existingAnalytics = await Analytics.findOne();
    if (!existingAnalytics) {
      await Analytics.insertMany([
        { date: '2026-08-01', revenue: 420000, occupancy: 81, rooms: 120, pendingTasks: 11, completedTasks: 145, staffPerformance: 91, kitchenExpenses: 21000, monthlyProfit: 310000, insights: ['Weekend occupancy improved', 'Kitchen timing is stable'] }
      ]);
    }

    const existingInventory = await Inventory.findOne();
    if (!existingInventory) {
      await Inventory.insertMany([
        { item: 'Rice', currentStock: 75, consumptionRate: 8, recommendedQty: 120, purchaseDate: '2026-08-02', daysRemaining: 3, alert: 'Low stock' },
        { item: 'Milk', currentStock: 42, consumptionRate: 6, recommendedQty: 90, purchaseDate: '2026-08-01', daysRemaining: 2, alert: 'Low stock' },
        { item: 'Gas', currentStock: 35, consumptionRate: 10, recommendedQty: 100, purchaseDate: '2026-07-31', daysRemaining: 1, alert: 'Critical' }
      ]);
    }

    const existingOwner = await User.findOne({ role: 'owner' });
    if (!existingOwner) {
      const password = await hashPassword('Admin@123');
      await User.create({
        name: 'Hotel Owner',
        email: 'owner@royalplaza.com',
        password,
        role: 'owner',
        hotelName: 'Royal Plaza Hotel Surat'
      });
    } else if (existingOwner.email === 'asha@royalplaza.com') {
      existingOwner.name = 'Hotel Owner';
      existingOwner.email = 'owner@royalplaza.com';
      await existingOwner.save();
    }

    // Clean up any legacy tableNumber stored in database for non-customer roles (owner, manager, staff)
    await User.updateMany(
      { role: { $ne: 'customer' }, tableNumber: { $exists: true } },
      { $unset: { tableNumber: '' } }
    );
  } catch (error) {
    console.error('Seed data failed', error);
  }
};
