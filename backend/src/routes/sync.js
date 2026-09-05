import express from 'express';
import { repository } from '../store/repository.js';
import { calculatePriority } from '../services/priorityService.js';
import { sendEmergencyAlert } from '../services/notificationService.js';
import { matchResponders } from '../services/matchingService.js';

const router = express.Router();

/**
 * POST /api/sync
 * Batch synchronize offline-captured citizen requests
 */
router.post('/', async (req, res) => {
  const { requests = [] } = req.body;
  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: 'Expected an array of requests under "requests"' });
  }

  const results = [];

  for (const item of requests) {
    try {
      // 1. Calculate Priority
      const priorityResult = await calculatePriority(item);

      // 2. Persist with deduplication
      const { request, isDuplicate } = repository.createRequest({
        ...item,
        ...priorityResult,
        is_offline_captured: true
      });

      // 3. Trigger alert if Critical or High and newly inserted
      if (!isDuplicate && (request.priority_level === 'CRITICAL' || request.priority_level === 'HIGH')) {
        const topResponder = matchResponders(request, repository.getResponders())[0];
        const targetPhone = topResponder ? topResponder.phone : '+919876543201';
        const alertMessage = `OFFLINE-SYNCED CRITICAL REQUEST #${request.id.slice(0, 8)}: ${request.priority_reason}. Location: ${request.latitude}, ${request.longitude}. Please respond.`;

        sendEmergencyAlert({
          requestId: request.id,
          recipientPhone: targetPhone,
          recipientRole: 'RESPONDER',
          message: alertMessage,
          priorityLevel: request.priority_level
        });
      }

      results.push({
        client_local_id: item.client_local_id,
        server_id: request.id,
        status: isDuplicate ? 'DUPLICATE_IGNORED' : 'SYNCED',
        priority_level: request.priority_level,
        priority_score: request.priority_score,
        request
      });
    } catch (err) {
      console.error('[Sync Error on Item]', err);
      results.push({
        client_local_id: item.client_local_id,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  res.json({
    synced_count: results.filter(r => r.status === 'SYNCED').length,
    duplicate_count: results.filter(r => r.status === 'DUPLICATE_IGNORED').length,
    failed_count: results.filter(r => r.status === 'FAILED').length,
    results
  });
});

export default router;
