import express from 'express';
import { repository } from '../store/repository.js';
import { calculatePriority } from '../services/priorityService.js';
import { sendEmergencyAlert } from '../services/notificationService.js';
import { matchResponders, matchVolunteers } from '../services/matchingService.js';

const router = express.Router();

/**
 * Helper to securely extract and verify authenticated user from token / headers
 */
async function getAuthenticatedUser(req) {
  let userId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.substring(7).trim();
    if (raw.startsWith('varahi-jwt-')) {
      userId = raw.replace('varahi-jwt-', '').trim();
    } else if (raw.includes('.')) {
      try {
        const parts = raw.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userId = payload.sub || payload.id || payload.user_id || null;
        }
      } catch {
        // Ignore decode failure
      }
      if (!userId) userId = raw;
    } else {
      userId = raw;
    }
  }
  if (!userId && req.headers['x-user-id']) {
    userId = String(req.headers['x-user-id']).trim();
  }
  if (!userId) return null;
  const user = await repository.getUserById(userId);
  return user || null;
}

/**
 * GET /api/requests
 * List emergency & resource requests with strict role-based data isolation:
 * - CITIZEN: sees ONLY requests submitted by that citizen.
 * - VOLUNTEER / RESPONDER: sees ONLY tasks assigned to that volunteer/responder.
 * - ADMIN: sees all requests without restriction.
 */
router.get('/', async (req, res) => {
  const { type, status, priority } = req.query;
  const authUser = await getAuthenticatedUser(req);

  let requests = await repository.getRequests({ type, status, priority });

  if (authUser) {
    const role = (authUser.role || '').toUpperCase();
    if (role === 'CITIZEN') {
      // Rule 1: A logged-in citizen must see ONLY emergency requests submitted by that same authenticated citizen
      requests = requests.filter(r => 
        r.citizen_id === authUser.id || 
        (r.citizen_phone && authUser.phone && r.citizen_phone === authUser.phone)
      );
    } else if (role === 'VOLUNTEER' || role === 'RESPONDER') {
      // Rule 2: A logged-in volunteer/responder must see ONLY tasks assigned to that authenticated volunteer/responder
      requests = requests.filter(r => {
        const isPrimaryAssignee = (
          r.assigned_to_user_id === authUser.id ||
          (r.assigned_to && r.assigned_to.id === authUser.id)
        );
        const isSupportAssignee = Array.isArray(r.support_assignments) && r.support_assignments.some(
          a => a.assigned_to_user_id === authUser.id || a.id === authUser.id
        );
        return isPrimaryAssignee || isSupportAssignee;
      });
    } else if (role === 'ADMIN') {
      // Rule 3: Admin sees all records
    }
  } else {
    // Unauthenticated access cannot see private requests
    requests = [];
  }

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
 * Retrieve specific request with matching candidates, enforcing authorization
 */
router.get('/:id', async (req, res) => {
  const request = await repository.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to view request details.' });
  }

  const role = (authUser.role || '').toUpperCase();
  if (role === 'CITIZEN') {
    const isOwner = (
      request.citizen_id === authUser.id ||
      (request.citizen_phone && authUser.phone && request.citizen_phone === authUser.phone)
    );
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this emergency request.' });
    }
  } else if (role === 'VOLUNTEER' || role === 'RESPONDER') {
    const isPrimaryAssignee = (
      request.assigned_to_user_id === authUser.id ||
      (request.assigned_to && request.assigned_to.id === authUser.id)
    );
    const isSupportAssignee = Array.isArray(request.support_assignments) && request.support_assignments.some(
      a => a.assigned_to_user_id === authUser.id || a.id === authUser.id
    );
    if (!isPrimaryAssignee && !isSupportAssignee) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this task.' });
    }
  } else if (role === 'ADMIN') {
    // Admin has full access
  } else {
    return res.status(403).json({ error: 'Forbidden' });
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

    const authUser = await getAuthenticatedUser(req);
    if (authUser) {
      body.citizen_id = authUser.id;
      body.citizen_name = body.citizen_name || authUser.full_name;
      body.citizen_phone = body.citizen_phone || authUser.phone;
    }

    // 1. Calculate Priority using FastAPI Priority Engine
    const priorityResult = await calculatePriority(body);

    // 2. Persist in Repository
    const { request, isDuplicate } = await repository.createRequest({
      ...body,
      ...priorityResult
    });

    // 3. Trigger SMS notification to assigned responder or high/critical alert
    if (!isDuplicate) {
      if (request.assigned_to_user_id) {
        const responders = await repository.getResponders();
        const assignedResp = responders.find(r => r.id === request.assigned_to_user_id || r.user_id === request.assigned_to_user_id);
        const targetPhone = assignedResp?.phone || '+919876543201';
        const distStr = request.responder_distance_km ? ` ~${request.responder_distance_km}km away` : '';
        const alertMessage = `🚨 NEW RESCUE TASK ASSIGNED #${request.id.slice(0, 8)}: ${request.priority_reason || request.category}. People: ${request.people_count}.${distStr} Location: ${request.latitude}, ${request.longitude} (${request.address}). Respond immediately.`;

        sendEmergencyAlert({
          requestId: request.id,
          recipientPhone: targetPhone,
          recipientRole: 'RESPONDER',
          message: alertMessage,
          priorityLevel: request.priority_level
        });
      } else if (request.priority_level === 'CRITICAL' || request.priority_level === 'HIGH') {
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

    const authUser = await getAuthenticatedUser(req);
    if (authUser) {
      body.citizen_id = authUser.id;
      body.citizen_name = body.citizen_name || authUser.full_name;
      body.citizen_phone = body.citizen_phone || authUser.phone;
    }

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
router.patch('/:id/status', async (req, res) => {
  const { status, changed_by, notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'New status is required' });
  }

  const request = await repository.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const nextStatus = String(status).toUpperCase();
  const authUser = await getAuthenticatedUser(req);

  if (nextStatus === 'ACCEPTED') {
    // Caller ID resolved from authenticated user or fallback token
    let callerId = authUser ? authUser.id : null;
    if (!callerId) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const raw = authHeader.substring(7).trim();
        if (raw.startsWith('varahi-jwt-')) {
          callerId = raw.replace('varahi-jwt-', '').trim();
        } else if (raw.includes('.')) {
          try {
            const parts = raw.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              callerId = payload.sub || payload.id || payload.user_id || null;
            }
          } catch {}
        }
      }
    }
    if (!callerId && req.headers['x-user-id']) {
      callerId = String(req.headers['x-user-id']).trim();
    }

    if (!callerId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to accept this task.' });
    }

    // Check if caller is the primary assigned responder or a support assignee
    const isPrimaryAssigned = (
      request.assigned_to_user_id === callerId ||
      (request.assigned_to && request.assigned_to.id === callerId)
    );

    const supportList = Array.isArray(request.support_assignments) ? request.support_assignments : [];
    const isSupportAssigned = supportList.some(
      a => a.assigned_to_user_id === callerId || a.id === callerId || a.user_id === callerId
    );

    const isAuthorizedResponder = isPrimaryAssigned || isSupportAssigned || (authUser && authUser.role === 'ADMIN');

    if (!isAuthorizedResponder) {
      console.warn(`[Accept Task] Auth mismatch — callerId=${callerId} assignedId=${request.assigned_to_user_id}`);
      return res.status(403).json({
        error: 'Forbidden: Only the responder assigned to this emergency can accept it.',
        debug: { callerId, assignedId: request.assigned_to_user_id }
      });
    }
  }

  const updated = await repository.updateRequestStatus(
    req.params.id,
    nextStatus,
    authUser?.full_name || changed_by || 'System',
    notes || (nextStatus === 'ACCEPTED' ? 'Responder acknowledged and accepted the task' : `Status changed to ${nextStatus}`),
    authUser?.id || null
  );

  if (!updated) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json({
    message: `Status updated to ${nextStatus}`,
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
