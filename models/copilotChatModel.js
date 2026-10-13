import mongoose from 'mongoose';

const copilotChatSchema = new mongoose.Schema({
  userId: { type: String, default: '', index: true },
  userName: { type: String, default: '' },
  userRole: { type: String, default: 'team member' },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  source: { type: String, default: 'intelligent-copilot' },
  hotelName: { type: String, default: 'Royal Plaza Hotel Surat' }
}, { timestamps: true });

export default mongoose.model('CopilotChat', copilotChatSchema);
