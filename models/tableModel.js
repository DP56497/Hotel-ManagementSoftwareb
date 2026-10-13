import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  capacity: { type: Number, default: 2 },
  category: { type: String, default: '2 Persons' },
  status: { type: String, enum: ['clean', 'unclean', 'needs_cleaning'], default: 'clean', index: true },
  lastCleanedAt: { type: Date, default: null },
  lastCleanedBy: { type: String, default: '' },
  lastVacatedAt: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Table', tableSchema);
