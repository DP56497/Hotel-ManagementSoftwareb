import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  tableNumber: { type: Number, required: true },
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    category: { type: String, default: '' }
  }],
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Preparing' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentMethod: { type: String, enum: ['upi', 'card', 'netbanking'], default: 'upi' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  paidAt: { type: Date, default: null },
  userEmail: { type: String, default: '' },
  userId: { type: String, default: '' },
  hotelName: { type: String, default: 'Royal Plaza Hotel Surat' },
  readyAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  preparedBy: { type: String, default: '' },
  servedBy: { type: String, default: '' },
  prepTimeMinutes: { type: Number, default: null },
  serveTimeMinutes: { type: Number, default: null },
  totalResponseTimeMinutes: { type: Number, default: null }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
