import mongoose from 'mongoose';

const aiReportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  summary: { type: String, required: true },
  recommendations: { type: [String], default: [] },
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AiReport', aiReportSchema);
