import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  date: { type: String, required: true },
  revenue: { type: Number, default: 0 },
  occupancy: { type: Number, default: 0 },
  rooms: { type: Number, default: 0 },
  pendingTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  staffPerformance: { type: Number, default: 0 },
  kitchenExpenses: { type: Number, default: 0 },
  monthlyProfit: { type: Number, default: 0 },
  insights: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model('Analytics', analyticsSchema);
