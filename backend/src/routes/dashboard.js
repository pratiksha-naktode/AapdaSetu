import express from 'express';
import { repository } from '../store/repository.js';

const router = express.Router();

router.get('/statistics', (req, res) => {
  const stats = repository.getStats();
  res.json({ statistics: stats });
});

router.get('/facilities', (req, res) => {
  const facilities = repository.getFacilities();
  res.json(facilities);
});

router.get('/disaster-event', (req, res) => {
  const event = repository.getDisasterEvent();
  res.json({ event });
});

export default router;
