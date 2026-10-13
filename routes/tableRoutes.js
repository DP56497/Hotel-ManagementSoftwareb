import express from 'express';
import Table from '../models/tableModel.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const DEFAULT_TABLE_COUNT = 50;
const getTableMeta = (number) => {
  if (number <= 10) return { capacity: 2, category: '2 Persons' };
  if (number <= 20) return { capacity: 4, category: '4 Persons' };
  if (number <= 30) return { capacity: 6, category: '6 Persons' };
  if (number <= 40) return { capacity: 12, category: '12 Persons' };
  return { capacity: 16, category: '16 Persons' };
};

// Auto-seed helper
const ensureTablesSeeded = async () => {
  const count = await Table.countDocuments();
  if (count < DEFAULT_TABLE_COUNT) {
    const existing = await Table.find({}).select('number').lean();
    const existingNums = new Set(existing.map((t) => t.number));
    const toInsert = [];
    for (let i = 1; i <= DEFAULT_TABLE_COUNT; i++) {
      if (!existingNums.has(i)) {
        const { capacity, category } = getTableMeta(i);
        toInsert.push({
          number: i,
          name: `Table #${i}`,
          capacity,
          category,
          status: 'clean'
        });
      }
    }
    if (toInsert.length > 0) {
      await Table.insertMany(toInsert);
    }
  }
};

// GET /api/tables - List all tables with live clean status
router.get('/', authMiddleware, async (req, res) => {
  try {
    await ensureTablesSeeded();
    const tables = await Table.find().sort({ number: 1 }).lean();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tables', error: error.message });
  }
});

// PUT /api/tables/:number/clean - Cleaning staff cleans and sanitizes table
router.put('/:number/clean', authMiddleware, async (req, res) => {
  try {
    const num = Number(req.params.number);
    const cleanedBy = req.user?.name || 'Cleaning Staff';
    const now = new Date();

    const meta = getTableMeta(num);
    const table = await Table.findOneAndUpdate(
      { number: num },
      {
        $set: {
          number: num,
          status: 'clean',
          lastCleanedAt: now,
          lastCleanedBy: cleanedBy,
          capacity: meta.capacity,
          category: meta.category
        }
      },
      { new: true, upsert: true }
    );

    res.json({ message: `Table #${num} marked as clean and sanitized`, table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark table clean', error: error.message });
  }
});

// PUT /api/tables/:number/unclean - Customer finishes dining/payment, table needs cleaning
router.put('/:number/unclean', authMiddleware, async (req, res) => {
  try {
    const num = Number(req.params.number);
    const now = new Date();

    const meta = getTableMeta(num);
    const table = await Table.findOneAndUpdate(
      { number: num },
      {
        $set: {
          number: num,
          status: 'unclean',
          lastVacatedAt: now,
          capacity: meta.capacity,
          category: meta.category
        }
      },
      { new: true, upsert: true }
    );

    res.json({ message: `Table #${num} marked as vacated and needs cleaning`, table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark table unclean', error: error.message });
  }
});

// PUT /api/tables/:number/status - Generic update for table status
router.put('/:number/status', authMiddleware, async (req, res) => {
  try {
    const num = Number(req.params.number);
    const { status } = req.body;
    const cleanStatus = ['clean', 'unclean', 'needs_cleaning'].includes(status) ? status : 'clean';

    const updateFields = { status: cleanStatus === 'needs_cleaning' ? 'unclean' : cleanStatus };
    if (cleanStatus === 'clean') {
      updateFields.lastCleanedAt = new Date();
      updateFields.lastCleanedBy = req.user?.name || 'Staff';
    } else {
      updateFields.lastVacatedAt = new Date();
    }

    const table = await Table.findOneAndUpdate(
      { number: num },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    res.json(table);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update table status', error: error.message });
  }
});

// POST /api/tables/reset-all-clean - Bulk mark all tables clean
router.post('/reset-all-clean', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const cleanedBy = req.user?.name || 'Cleaning Staff';
    await Table.updateMany(
      {},
      { $set: { status: 'clean', lastCleanedAt: now, lastCleanedBy: cleanedBy } }
    );
    const tables = await Table.find().sort({ number: 1 }).lean();
    res.json({ message: 'All 50 dining tables sanitized and marked clean', tables });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset tables', error: error.message });
  }
});

export default router;
