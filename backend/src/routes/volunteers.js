import express from 'express';
import { repository } from '../store/repository.js';
import { matchVolunteers } from '../services/matchingService.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ volunteers: repository.getVolunteers() });
});

router.get('/matching', (req, res) => {
  const { resource, lat, lon } = req.query;
  const volunteers = repository.getVolunteers();
  const mockReq = {
    latitude: lat ? Number(lat) : 16.5449,
    longitude: lon ? Number(lon) : 81.5212,
    requested_resource: resource || 'food'
  };
  const sorted = matchVolunteers(mockReq, volunteers);
  res.json({ volunteers: sorted });
});

router.post('/:id/accept', (req, res) => {
  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: 'request_id is required' });
  }

  const vol = repository.getVolunteers().find(v => v.id === req.params.id);
  const updated = repository.assignRequest(request_id, {
    id: req.params.id,
    name: vol ? vol.name : 'Volunteer Responder',
    role: 'VOLUNTEER'
  });

  if (!updated) {
    return res.status(404).json({ error: 'Request not found' });
  }

  repository.updateRequestStatus(request_id, 'ACCEPTED', vol ? vol.name : 'Volunteer');

  res.json({
    message: 'Volunteer successfully accepted request',
    request: repository.getRequestById(request_id)
  });
});

export default router;
