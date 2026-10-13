import express from 'express';
import { getMessages, createMessage, markMessagesRead } from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getMessages);
router.post('/', authMiddleware, createMessage);
router.patch('/read', authMiddleware, markMessagesRead);

export default router;