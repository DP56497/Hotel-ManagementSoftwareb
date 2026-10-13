import express from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Order from '../models/orderModel.js';
import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import Table from '../models/tableModel.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) return null;
  if (keySecret === 'your_razorpay_secret' || keySecret.length < 8) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getUpiPaymentDetails = (order) => {
  const upiId = (process.env.UPI_ID || '9712071875@ptsbi').trim();
  const payeeName = (process.env.UPI_PAYEE_NAME || 'Royal Plaza Hotel').trim();
  const totalAmount = Number(order.total || 0).toFixed(2);
  const orderIdentifier = order._id || order.id || Date.now();
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: totalAmount,
    cu: 'INR',
    tn: `Royal Plaza Order ${String(orderIdentifier).slice(-6)}`
  });
  const upiUrl = `upi://pay?${params.toString()}`;
  return {
    upiId,
    payeeName,
    amount: totalAmount,
    upiUrl,
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`
  };
};

const isOrderOwnedByUser = (order, user) => {
  if (!user || user.role !== 'customer') return true;
  if (order.userId && order.userId === user.id) return true;
  if (order.userEmail && user.email && order.userEmail.toLowerCase() === user.email.toLowerCase()) return true;
  if (order.customerName && user.name && order.customerName.toLowerCase() === user.name.toLowerCase()) return true;
  return false;
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user?.role === 'customer') {
      const userConditions = [];
      if (req.user.id) userConditions.push({ userId: req.user.id });
      if (req.user.email) userConditions.push({ userEmail: req.user.email.toLowerCase() });
      if (req.user.name) {
        userConditions.push({
          customerName: req.user.name,
          $or: [
            { userId: { $in: ['', null] } },
            { userEmail: { $in: ['', null] } }
          ]
        });
      }
      query = userConditions.length > 0 ? { $or: userConditions } : { customerName: req.user.name };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load orders', error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.body.userId || req.user?.id || '',
      userEmail: req.body.userEmail || req.user?.email || '',
      customerName: req.body.customerName || req.user?.name || 'Customer'
    };
    const order = await Order.create(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

router.post('/:id/payment/order', authMiddleware, async (req, res) => {
  try {
    const paymentMethod = ['upi', 'card', 'netbanking'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'upi';
    const razorpay = getRazorpay();
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!isOrderOwnedByUser(order, req.user)) return res.status(403).json({ message: 'Access denied: not your order' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order is already paid' });

    const upi = getUpiPaymentDetails(order);
    if (!razorpay) {
      if (paymentMethod !== 'upi') {
        return res.status(503).json({
          message: 'Card and netbanking payments require Razorpay configuration in backend/.env'
        });
      }
      return res.json({ mode: 'upi-test', ...upi, amount: Math.round(Number(order.total) * 100), currency: 'INR' });
    }

    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(Number(order.total) * 100),
        currency: 'INR',
        receipt: `order_${order._id}`,
        notes: { hotelOrderId: String(order._id) }
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      return res.json({
        mode: 'razorpay',
        keyId: process.env.RAZORPAY_KEY_ID?.trim(),
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        paymentMethod,
        ...upi
      });
    } catch (razorError) {
      const errorDesc = razorError?.error?.description || razorError?.message || 'Authentication or gateway communication error';
      console.error(`[Razorpay Order Error] Code: ${razorError?.statusCode || 500} - ${errorDesc}`);

      // Graceful fallback for UPI payments so customer is never blocked
      if (paymentMethod === 'upi') {
        return res.json({
          mode: 'upi-test',
          ...upi,
          amount: Math.round(Number(order.total) * 100),
          currency: 'INR',
          warning: `Razorpay unavailable (${errorDesc}). Switched to direct UPI QR payment.`
        });
      }

      return res.status(502).json({
        message: `Failed to create Razorpay order: ${errorDesc}. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env, or choose UPI payment.`,
        error: errorDesc
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to process payment order', error: error.message });
  }
});

router.post('/:id/payment/upi-confirm', authMiddleware, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_PAYMENTS !== 'true') {
      return res.status(403).json({ message: 'Test UPI confirmation is disabled in production' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!isOrderOwnedByUser(order, req.user)) return res.status(403).json({ message: 'Access denied: not your order' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order is already paid' });
    order.paymentStatus = 'paid';
    order.status = 'Completed';
    order.paymentMethod = 'upi';
    order.razorpayPaymentId = `upi_test_${Date.now()}`;
    order.paidAt = new Date();
    await order.save();
    if (order.tableNumber) {
      await Table.findOneAndUpdate(
        { number: Number(order.tableNumber) },
        { $set: { status: 'unclean', lastVacatedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm test UPI payment', error: error.message });
  }
});

router.post('/:id/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!isOrderOwnedByUser(order, req.user)) return res.status(403).json({ message: 'Access denied: not your order' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order is already paid' });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) return res.status(400).json({ message: 'Invalid Razorpay order' });

    const expectedSignature = crypto
      .createHmac('sha256', (process.env.RAZORPAY_KEY_SECRET || '').trim())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature || '');
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ message: 'Invalid Razorpay payment signature' });
    }

    order.paymentStatus = 'paid';
    order.status = 'Completed';
    order.paymentMethod = ['upi', 'card', 'netbanking'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'upi';
    order.razorpayPaymentId = razorpay_payment_id;
    order.paidAt = new Date();
    await order.save();
    if (order.tableNumber) {
      await Table.findOneAndUpdate(
        { number: Number(order.tableNumber) },
        { $set: { status: 'unclean', lastVacatedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify Razorpay payment', error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Customers cannot modify order status' });
    }
    const isBillSettlement = req.body.paymentStatus === 'paid' || req.body.status === 'Completed';
    const canHandleFoodOrders = req.user.role !== 'staff' || ['chef', 'waiter'].includes(req.user.staffCategory) || isBillSettlement;
    if (!canHandleFoodOrders) {
      return res.status(403).json({ message: 'Cleaning staff cannot update food preparation status' });
    }

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updateData = { ...req.body };
    const now = new Date();

    if (req.body.paymentStatus === 'paid') {
      updateData.paidAt = updateData.paidAt || now;
      const targetTable = existingOrder.tableNumber || req.body.tableNumber;
      if (targetTable) {
        await Table.findOneAndUpdate(
          { number: Number(targetTable) },
          { $set: { status: 'unclean', lastVacatedAt: now } },
          { upsert: true }
        ).catch(() => {});
      }
    }

    // Chef finishes preparation: status becomes 'Ready' -> Automatically notify waiters
    if (req.body.status === 'Ready' && existingOrder.status !== 'Ready') {
      updateData.readyAt = updateData.readyAt || now;
      updateData.preparedBy = req.body.updatedBy || req.user.name || existingOrder.preparedBy || 'Chef Staff';
      const createdTime = new Date(existingOrder.createdAt || now).getTime();
      const prepMinutes = Math.max(0.5, ((now.getTime() - createdTime) / 60000));
      updateData.prepTimeMinutes = parseFloat(prepMinutes.toFixed(1));

      // Automated alert message for waiter staff
      try {
        const waiterUsers = await User.find({ role: 'staff', staffCategory: 'waiter' });
        const itemsSummary = (existingOrder.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ') || 'Fresh dishes';
        const content = `🔔 Table #${existingOrder.tableNumber} Order is READY TO SERVE! 🍳 (${itemsSummary}) — Please pick up from Kitchen counter.`;

        if (waiterUsers.length > 0) {
          for (const waiter of waiterUsers) {
            await Message.create({
              senderId: String(req.user?.id || req.user?._id || 'chef'),
              senderName: req.user?.name || 'Kitchen Chef',
              senderRole: 'staff',
              recipientId: String(waiter._id),
              recipientName: waiter.name,
              recipientRole: 'staff',
              content,
              read: false,
              createdAt: now
            });
          }
        } else {
          await Message.create({
            senderId: String(req.user?.id || req.user?._id || 'chef'),
            senderName: req.user?.name || 'Kitchen Chef',
            senderRole: 'staff',
            recipientId: 'waiters',
            recipientName: 'Waiter Staff',
            recipientRole: 'staff',
            content,
            read: false,
            createdAt: now
          });
        }
      } catch (msgError) {
        console.warn('Auto notification message creation warning:', msgError.message);
      }
    }

    // Waiter serves to table: status becomes 'Completed'
    if (req.body.status === 'Completed' && existingOrder.status !== 'Completed') {
      updateData.completedAt = updateData.completedAt || now;
      updateData.servedBy = req.body.updatedBy || req.user.name || existingOrder.servedBy || 'Waiter Staff';
      
      const readyTime = existingOrder.readyAt ? new Date(existingOrder.readyAt).getTime() : new Date(existingOrder.createdAt || now).getTime();
      const createdTime = new Date(existingOrder.createdAt || now).getTime();
      
      const serveMinutes = Math.max(0.5, ((now.getTime() - readyTime) / 60000));
      const totalMinutes = Math.max(0.5, ((now.getTime() - createdTime) / 60000));
      
      updateData.serveTimeMinutes = parseFloat(serveMinutes.toFixed(1));
      updateData.totalResponseTimeMinutes = parseFloat(totalMinutes.toFixed(1));
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const isOwnerOrManager = ['owner', 'manager'].includes(req.user?.role);
    const isWaiterStaff = req.user?.role === 'staff' && (req.user?.staffCategory === 'waiter' || !req.user?.staffCategory);
    if (!isOwnerOrManager && !isWaiterStaff) {
      return res.status(403).json({ message: 'Only owner, manager, or waiter staff can delete orders and records' });
    }
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order and invoice deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete order', error: error.message });
  }
});

export default router;
