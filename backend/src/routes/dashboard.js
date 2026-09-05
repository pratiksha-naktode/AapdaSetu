import express from 'express';
import { repository } from '../store/repository.js';

const router = express.Router();

router.get('/statistics', async (req, res) => {
  const stats = await repository.getStats();
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

/**
 * GET /api/facilities/nearby or /api/dashboard/facilities/nearby
 * Returns real hospitals or police stations sorted by distance from citizen coordinates
 */
router.get(['/facilities/nearby', '/nearby'], async (req, res) => {
  try {
    const { type = 'hospitals', latitude, longitude, radius_km = 15 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'latitude and longitude are required to compute nearby facilities'
      });
    }

    const facilities = await repository.getNearbyFacilities(
      type.toLowerCase(),
      latitude,
      longitude,
      Number(radius_km) || 15
    );

    return res.json({
      type,
      count: facilities.length,
      facilities
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
