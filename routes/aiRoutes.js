import express from 'express';
import { askCopilot, createAiReport, getAiReports, getCopilotHistory, clearCopilotHistory } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/reports', authMiddleware, getAiReports);
router.post('/reports', authMiddleware, createAiReport);
router.post('/copilot', authMiddleware, askCopilot);
router.get('/copilot/history', authMiddleware, getCopilotHistory);
router.delete('/copilot/history', authMiddleware, clearCopilotHistory);

export default router;
