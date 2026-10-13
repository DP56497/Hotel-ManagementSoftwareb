import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  item: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  consumptionRate: { type: Number, default: 0 },
  recommendedQty: { type: Number, default: 0 },
  purchaseDate: { type: String, default: '' },
  daysRemaining: { type: Number, default: 0 },
  alert: { type: String, default: 'Healthy' }
}, { timestamps: true });

export default mongoose.model('Inventory', inventorySchema);
