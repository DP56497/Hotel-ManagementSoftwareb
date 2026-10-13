import express from 'express';
import MenuItem from '../models/menuItemModel.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { seedMenuItems } from '../utils/menuSeedList.js';

const router = express.Router();

router.post('/seed', authMiddleware, async (req, res) => {
  try {
    await MenuItem.deleteMany({});
    const inserted = await MenuItem.insertMany(seedMenuItems);
    res.json({ ok: true, count: inserted.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed menu items', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await MenuItem.find({ active: true }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load menu', error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create menu item', error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
  }
});

export default router;
