import express from 'express';
import { repository } from '../store/repository.js';
import { matchResponders } from '../services/matchingService.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ responders: repository.getResponders() });
});

router.get('/nearby', (req, res) => {
  const { lat, lon, type } = req.query;
  const responders = repository.getResponders();
  const mockReq = {
    latitude: lat ? Number(lat) : 16.5449,
    longitude: lon ? Number(lon) : 81.5212,
    recommended_responder: type || 'RESCUE_TEAM'
  };
  const sorted = matchResponders(mockReq, responders);
  res.json({ responders: sorted });
});

export default router;
