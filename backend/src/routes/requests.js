import express from 'express';
import { repository } from '../store/repository.js';
import { calculatePriority } from '../services/priorityService.js';
import { sendEmergencyAlert } from '../services/notificationService.js';
import { matchResponders, matchVolunteers } from '../services/matchingService.js';

const router = express.Router();

/**
 * GET /api/requests
 * List all emergency & resource requests
 */
router.get('/', async (req, res) => {
  const { type, status, priority } = req.query;
  const requests = await repository.getRequests({ type, status, priority });
  res.json({ count: requests.length, requests });
});

/**
 * GET /api/requests/:id/matches
 * Retrieve intelligent rule-based matches and scoring for request
 */
router.get('/:id/matches', async (req, res) => {
  try {
    const matchResult = await repository.getMatchesForRequest(req.params.id);
    if (!matchResult) {
      return res.status(404).json({ error: 'Disaster request not found' });
    }
    return res.json(matchResult);
  } catch (err) {
    console.error('[Matches API Error]', err);
    return res.status(500).json({ error: 'Failed to compute matches', details: err.message });
  }
});

/**
 * GET /api/requests/:id
 * Retrieve specific request with matching candidates
 */
router.get('/:id', async (req, res) => {
  const request = await repository.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const matchData = await repository.getMatchesForRequest(req.params.id);

  res.json({
    request,
    matchingCandidates: matchData ? matchData.candidates : [],
    matching: matchData
  });
});

/**
 * POST /api/requests/emergency
 * Create citizen emergency request, compute priority, and dispatch alert
 */
router.post('/emergency', async (req, res) => {
  try {
    const body = req.body;
    body.request_type = 'EMERGENCY';

    // 1. Calculate Priority using FastAPI Priority Engine
    const priorityResult = await calculatePriority(body);

    // 2. Persist in Repository
    const { request, isDuplicate } = await repository.createRequest({
      ...body,
      ...priorityResult
    });

    // 3. Trigger SMS notification if CRITICAL or HIGH
    if (!isDuplicate && (request.priority_level === 'CRITICAL' || request.priority_level === 'HIGH')) {
      const responders = await repository.getResponders();
      const topResponder = matchResponders(request, responders)[0];
      const targetPhone = topResponder ? topResponder.phone : '+919876543201';

      const alertMessage = `CRITICAL DISASTER REQUEST: Request #${request.id.slice(0, 8)}. ${request.priority_reason} People: ${request.people_count}. Location: ${request.latitude}, ${request.longitude} (${request.address}). Respond immediately.`;

      sendEmergencyAlert({
        requestId: request.id,
        recipientPhone: targetPhone,
        recipientRole: 'RESPONDER',
        message: alertMessage,
        priorityLevel: request.priority_level
      });
    }

    return res.status(201).json({
      message: isDuplicate ? 'Request already received (deduplicated)' : 'Emergency request submitted and prioritized',
      isDuplicate,
      request
    });
  } catch (err) {
    console.error('[Emergency Request Error]', err);
    res.status(500).json({ error: 'Failed to process emergency request', details: err.message });
  }
});

/**
 * POST /api/requests/resource
 * Create resource request, calculate priority, and match volunteers
 */
router.post('/resource', async (req, res) => {
  try {
    const body = req.body;
    body.request_type = 'RESOURCE';

    // 1. Calculate Priority
    const priorityResult = await calculatePriority(body);

    // 2. Persist in Repository
    const { request, isDuplicate } = await repository.createRequest({
      ...body,
      ...priorityResult
    });

    // 3. Trigger notification to top matching volunteer if HIGH
    if (!isDuplicate && request.priority_level === 'HIGH') {
      const volunteers = await repository.getVolunteers();
      const topVol = matchVolunteers(request, volunteers)[0];
      if (topVol) {
        const alertMessage = `HIGH PRIORITY RESOURCE REQUEST #${request.id.slice(0, 8)}: ${request.requested_resource || request.category}. Address: ${request.address}. Distance: ~${topVol.distance_km}km.`;
        sendEmergencyAlert({
          requestId: request.id,
          recipientPhone: topVol.phone,
          recipientRole: 'VOLUNTEER',
          message: alertMessage,
          priorityLevel: request.priority_level
        });
      }
    }

    return res.status(201).json({
      message: isDuplicate ? 'Request already received (deduplicated)' : 'Resource request submitted and prioritized',
      isDuplicate,
      request
    });
  } catch (err) {
    console.error('[Resource Request Error]', err);
    res.status(500).json({ error: 'Failed to process resource request', details: err.message });
  }
});

/**
 * DELETE /api/requests/:id
 * Remove request from database and local store
 */
router.delete('/:id', async (req, res) => {
  try {
    await repository.deleteRequest(req.params.id);
    res.json({ message: 'Request deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete request', details: err.message });
  }
});

/**
 * PATCH /api/requests/:id/status
 * Update status (PENDING -> ACCEPTED -> ON_THE_WAY -> RESOLVED etc)
 */
router.patch('/:id/status', (req, res) => {
  const { status, changed_by, notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'New status is required' });
  }

  const updated = repository.updateRequestStatus(req.params.id, status, changed_by, notes);
  if (!updated) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json({
    message: `Status updated to ${status}`,
    request: updated
  });
});

/**
 * POST /api/requests/:id/assign
 * Assign to responder or volunteer (Authorized personnel only, duplicate-safe)
 */
router.post('/:id/assign', async (req, res) => {
  const { assigned_to, changed_by } = req.body;
  if (!assigned_to || !assigned_to.id) {
    return res.status(400).json({ error: 'Assignee details with valid ID required' });
  }

  // Extract caller role
  let userRole = req.headers['x-user-role'] || req.query.role;
  const authHeader = req.headers['authorization'];
  if (!userRole && authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.substring(7);
    const callerId = raw.startsWith('varahi-jwt-') ? raw.replace('varahi-jwt-', '') : raw;
    const caller = await repository.getUserById(callerId);
    if (caller) {
      userRole = caller.role;
    }
  }

  const result = await repository.assignRequest(
    req.params.id,
    assigned_to,
    changed_by || assigned_to.name || 'Admin',
    userRole
  );

  if (result.error) {
    return res.status(result.status || 400).json({
      error: result.error,
      code: result.code,
      current_assigned_to: result.current_assigned_to
    });
  }

  return res.json({
    message: 'Request assigned successfully',
    request: result.request
  });
});

/**
 * POST /api/requests/:id/assign-support
 * Assign additional volunteer or responder to the same task without unassigning primary
 */
router.post('/:id/assign-support', async (req, res) => {
  try {
    const { personnel_id, role, assigned_by } = req.body;
    if (!personnel_id) {
      return res.status(400).json({ error: 'personnel_id is required' });
    }
    const assignment = await repository.assignSupportPersonnel(
      req.params.id,
      personnel_id,
      role || 'VOLUNTEER',
      assigned_by || 'Admin'
    );
    const updatedRequest = await repository.getRequestById(req.params.id);
    return res.json({
      message: 'Additional support assigned successfully',
      assignment,
      request: updatedRequest
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/requests/:id/reassign
 * Reassign the primary assignment of a task to a different personnel
 */
router.post('/:id/reassign', async (req, res) => {
  try {
    const { personnel_id, role, assigned_by, reason } = req.body;
    if (!personnel_id) {
      return res.status(400).json({ error: 'personnel_id is required' });
    }
    const request = await repository.reassignPrimaryPersonnel(
      req.params.id,
      personnel_id,
      role || 'VOLUNTEER',
      assigned_by || 'Admin',
      reason
    );
    return res.json({
      message: 'Primary assignment reallocated successfully',
      request
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/requests/:id/reports
 * Submit task help / issue report from volunteer or responder
 */
router.post('/:id/reports', async (req, res) => {
  try {
    const { reported_by_user_id, reporter_name, reporter_role, issue_type, description, latitude, longitude } = req.body;
    if (!issue_type || !description) {
      return res.status(400).json({ error: 'Issue type and description are required' });
    }
    const report = await repository.createTaskReport({
      request_id: req.params.id,
      reported_by_user_id,
      reporter_name,
      reporter_role: (reporter_role || 'VOLUNTEER').toUpperCase(),
      issue_type,
      description,
      latitude,
      longitude
    });
    return res.status(201).json({
      message: 'Issue reported to Command Center successfully',
      report
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/reports
 * Retrieve all active / acknowledged / resolved task reports
 */
router.get('/reports/all', async (req, res) => {
  try {
    const { status, request_id } = req.query;
    const reports = await repository.getTaskReports({ requestId: request_id, status });
    return res.json({ count: reports.length, reports });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/reports/:id
 * Acknowledge or Resolve task report
 */
router.patch('/reports/:id', async (req, res) => {
  try {
    const { status, resolved_by } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required (OPEN, ACKNOWLEDGED, RESOLVED)' });
    }
    const report = await repository.updateTaskReportStatus(req.params.id, status, resolved_by);
    return res.json({
      message: `Report marked as ${status}`,
      report
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
