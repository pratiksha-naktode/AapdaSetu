import express from 'express';
import { getNotificationLogs } from '../services/notificationService.js';

const router = express.Router();

router.get('/', (req, res) => {
  const logs = getNotificationLogs();
  res.json({ count: logs.length, notifications: logs });
});

export default router;
