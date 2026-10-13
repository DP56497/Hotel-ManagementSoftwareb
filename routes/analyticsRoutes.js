import express from 'express';
import { getAnalyticsOverview, seedAnalytics } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', authMiddleware, getAnalyticsOverview);
router.post('/seed', authMiddleware, seedAnalytics);

export default router;
