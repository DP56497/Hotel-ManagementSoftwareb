import Expense from '../models/expenseModel.js';

export const createExpense = async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ message: 'Only the owner can add hotel costs' });
    const { category, amount, period, date } = req.body;
    if (!category || Number(amount) <= 0 || !date) {
      return res.status(400).json({ message: 'Category, a positive amount, and date are required' });
    }
    const expense = await Expense.create({ category: category.trim(), amount: Number(amount), period: period || 'daily', date });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add expense', error: error.message });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load expenses', error: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ message: 'Only the owner can delete hotel costs' });
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
};

export const seedExpenses = async (req, res) => {
  try {
    res.json({ ok: true, count: 0, message: 'Default expenses seeding is disabled. Only manual expenses are tracked.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed expenses', error: error.message });
  }
};

