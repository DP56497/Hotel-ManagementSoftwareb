import express from 'express';
import User from '../models/userModel.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { hashPassword, isStrongPassword } from '../utils/auth.js';

const router = express.Router();

// Return all user accounts (without passwords)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users', error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, email, password, role, staffCategory, hotelName, tableNumber, aadhaarNumber, faceImage } = req.body;

    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You are not allowed to create accounts' });
    }
    if (!name || !email || !password || !['manager', 'staff', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Name, email, password, and a valid role are required' });
    }
    if (req.user.role === 'manager' && role !== 'customer') {
      return res.status(403).json({ message: 'Managers can only create customer accounts' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be 8-128 characters and include uppercase, lowercase, number, and symbol' });
    }
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ message: 'User already exists' });

    const isCustomer = role === 'customer';
    const parsedTableNumber = isCustomer ? (Number(tableNumber) || 1) : undefined;

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: await hashPassword(password),
      role,
      staffCategory: role === 'staff' ? (staffCategory || 'waiter') : undefined,
      hotelName: hotelName || 'Royal Plaza Hotel Surat',
      ...(isCustomer ? { tableNumber: parsedTableNumber } : {}),
      aadhaarNumber: aadhaarNumber || undefined,
      faceImage: faceImage || undefined
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffCategory: user.staffCategory,
      hotelName: user.hotelName,
      ...(isCustomer && user.tableNumber ? { tableNumber: user.tableNumber } : {}),
      aadhaarNumber: user.aadhaarNumber,
      faceImage: user.faceImage
    });
  } catch (error) {
    res.status(500).json({ message: 'Account could not be created' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only hotel owner can delete accounts' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

export default router;
