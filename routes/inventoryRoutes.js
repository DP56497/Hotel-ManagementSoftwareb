import express from 'express';
import { getInventory, seedInventory } from '../controllers/inventoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', authMiddleware, getInventory);
router.post('/seed', authMiddleware, seedInventory);

export default router;
