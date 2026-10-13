import Message from '../models/messageModel.js';
import { filterMessagesForUser, markMessagesAsReadForUser } from '../utils/messageUtils.js';

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const isOwner = req.user.role === 'owner';
    const isWaiter = req.user.role === 'staff' && req.user.staffCategory === 'waiter';
    let query = {};
    if (!isOwner) {
      const orConditions = [{ recipientId: userId }, { senderId: userId }];
      if (isWaiter) {
        orConditions.push({ recipientId: 'waiters' }, { recipientId: 'all_waiters' });
      }
      query = { $or: orConditions };
    }

    // Get all messages where user is sender or recipient (or all for owner)
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const visibleMessages = filterMessagesForUser(messages, userId, req.user.role, req.user.staffCategory);
    
    // Mark received messages as read
    const unreadMessageIds = visibleMessages
      .filter((message) => String(message.recipientId) === String(userId) && !message.read)
      .map((message) => message._id);

    if (unreadMessageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $set: { read: true } }
      );
      // Update the local messages array to reflect read status
      visibleMessages.forEach((message) => {
        if (unreadMessageIds.some((id) => String(id) === String(message._id))) {
          message.read = true;
        }
      });
    }

    res.json(visibleMessages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load messages', error: error.message });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { recipientId, recipientName, recipientRole, content } = req.body;
    const senderId = req.user.id;
    const senderName = req.user.name || req.user.email || 'Unknown sender';
    const senderRole = req.user.role || 'owner';

    // Validation
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
    if (!recipientName || !recipientRole) {
      return res.status(400).json({ message: 'Recipient name and role are required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.create({
      senderId: String(senderId),
      senderName: String(senderName),
      senderRole: String(senderRole),
      recipientId: String(recipientId),
      recipientName: String(recipientName),
      recipientRole: String(recipientRole),
      content: content.trim(),
      read: false,
      createdAt: new Date()
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Message creation error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

export const markMessagesRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await Message.updateMany(
      { recipientId: String(userId), read: false },
      { $set: { read: true } }
    );

    res.json({
      updatedCount: updated.modifiedCount || 0,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
  }
};