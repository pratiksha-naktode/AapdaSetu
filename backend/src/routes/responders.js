import express from 'express';
import { repository } from '../store/repository.js';
import { matchResponders } from '../services/matchingService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const responders = await repository.getResponders();
  res.json({ responders });
});

router.get('/nearby', async (req, res) => {
  const { lat, lon, type } = req.query;
  const responders = await repository.getResponders();
  const mockReq = {
    latitude: lat ? Number(lat) : 16.5449,
    longitude: lon ? Number(lon) : 81.5212,
    recommended_responder: type || 'RESCUE_TEAM'
  };
  const sorted = matchResponders(mockReq, responders);
  res.json({ responders: sorted });
});

router.patch('/:id/location', async (req, res) => {
  const { latitude, longitude, is_available } = req.body;
  const updated = await repository.updateResponderLocation(req.params.id, { latitude, longitude, is_available });
  res.json({ message: 'Responder location updated successfully', responder: updated });
});

export default router;
