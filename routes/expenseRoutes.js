import express from 'express';
import { createExpense, getExpenses, seedExpenses, deleteExpense } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', authMiddleware, getExpenses);
router.post('/', authMiddleware, createExpense);
router.delete('/:id', authMiddleware, deleteExpense);
router.post('/seed', authMiddleware, seedExpenses);

export default router;
