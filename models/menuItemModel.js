import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  image: { type: String, default: '🍽️' },
  stock: { type: Number, default: 0 },
  hotelName: { type: String, default: 'Royal Plaza Hotel Surat' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('MenuItem', menuItemSchema);
