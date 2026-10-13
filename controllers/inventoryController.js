import Inventory from '../models/inventoryModel.js';

export const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load inventory', error: error.message });
  }
};

export const seedInventory = async (req, res) => {
  try {
    await Inventory.deleteMany({});
    const seed = [
      { item: 'Rice', currentStock: 75, consumptionRate: 8, recommendedQty: 120, purchaseDate: '2026-07-30', daysRemaining: 3, alert: 'Low stock' },
      { item: 'Milk', currentStock: 42, consumptionRate: 6, recommendedQty: 90, purchaseDate: '2026-07-29', daysRemaining: 2, alert: 'Low stock' },
      { item: 'Soap', currentStock: 90, consumptionRate: 4, recommendedQty: 60, purchaseDate: '2026-08-02', daysRemaining: 7, alert: 'Healthy' },
      { item: 'Gas', currentStock: 35, consumptionRate: 10, recommendedQty: 100, purchaseDate: '2026-07-28', daysRemaining: 1, alert: 'Critical' }
    ];
    const result = await Inventory.insertMany(seed);
    res.json({ ok: true, count: result.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed inventory', error: error.message });
  }
};
