import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true, enum: ['owner', 'manager', 'staff', 'customer'] },
  recipientId: { type: String, required: true, index: true },
  recipientName: { type: String, required: true },
  recipientRole: { type: String, required: true, enum: ['owner', 'manager', 'staff', 'customer'] },
  content: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for efficient querying of user messages
messageSchema.index({ recipientId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ $or: [{ senderId: 1 }, { recipientId: 1 }] });

export default mongoose.model('Message', messageSchema);