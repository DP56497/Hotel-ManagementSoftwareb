import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'manager', 'staff', 'customer'], default: 'customer' },
  staffCategory: { type: String, enum: ['chef', 'cleaning', 'waiter'] },
  hotelName: { type: String, default: 'Royal Plaza Hotel Surat' },
  tableNumber: { type: Number },
  aadhaarNumber: { type: String },
  faceImage: { type: String },
  active: { type: Boolean, default: true },
  refreshTokens: [{
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  resetPasswordTokenHash: { type: String, select: false },
  resetPasswordExpiresAt: { type: Date, select: false }
}, { timestamps: true });

userSchema.pre('save', function (next) {
  if (this.role !== 'customer') {
    this.tableNumber = undefined;
  }
  next();
});

export default mongoose.model('User', userSchema);
