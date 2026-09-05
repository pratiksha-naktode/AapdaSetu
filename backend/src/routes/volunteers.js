import express from 'express';
import { repository } from '../store/repository.js';
import { matchVolunteers } from '../services/matchingService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const volunteers = await repository.getVolunteers();
  res.json({ volunteers });
});

router.get('/matching', async (req, res) => {
  const { resource, lat, lon } = req.query;
  const volunteers = await repository.getVolunteers();
  const mockReq = {
    latitude: lat ? Number(lat) : 16.5449,
    longitude: lon ? Number(lon) : 81.5212,
    requested_resource: resource || 'food'
  };
  const sorted = matchVolunteers(mockReq, volunteers);
  res.json({ volunteers: sorted });
});

router.post('/:id/accept', async (req, res) => {
  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: 'request_id is required' });
  }

  const volunteers = await repository.getVolunteers();
  const vol = volunteers.find(v => v.id === req.params.id);
  const result = await repository.assignRequest(request_id, {
    id: req.params.id,
    name: vol ? vol.name : 'Volunteer Responder',
    role: 'VOLUNTEER'
  }, vol ? vol.name : 'Volunteer', 'VOLUNTEER');

  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error, code: result.code });
  }

  repository.updateRequestStatus(request_id, 'ACCEPTED', vol ? vol.name : 'Volunteer');
  const fresh = await repository.getRequestById(request_id);

  res.json({
    message: 'Volunteer successfully accepted request',
    request: fresh
  });
});

export default router;
