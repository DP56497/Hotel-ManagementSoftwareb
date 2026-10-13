import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, default: 0 },
  period: { type: String, default: 'daily' },
  date: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
