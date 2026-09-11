import { EmergencyRequest, DashboardStats, DisasterEvent, Facility, Responder, Volunteer } from '../types';
import { queueOfflineRequest, syncOfflineQueue } from './offlineStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('varahi_auth_token');
  const storedUser = localStorage.getItem('varahi_auth_user');
  let userId = '';
  if (storedUser) {
    try {
      userId = JSON.parse(storedUser).id || '';
    } catch {
      // Ignore
    }
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {})
  };
}

export const api = {
  // Requests
  async getRequests(params?: { type?: string; status?: string; priority?: string }): Promise<EmergencyRequest[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/api/requests${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch requests');
    const data = await res.json();
    return data.requests;
  },

  async getRequestById(id: string): Promise<{ request: EmergencyRequest; matchingCandidates: any[] }> {
    const res = await fetch(`${API_BASE}/api/requests/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch request');
    return res.json();
  },

  async submitEmergencyRequest(data: Partial<EmergencyRequest>): Promise<{ request: EmergencyRequest; isOfflineQueued?: boolean }> {
    // If browser is offline or server unreachable, queue offline
    if (!navigator.onLine) {
      console.warn('Browser is OFFLINE. Queuing request locally in IndexedDB...');
      const queued = await queueOfflineRequest(data);
      return {
        request: queued.data as EmergencyRequest,
        isOfflineQueued: true
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/requests/emergency`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Network response not ok');
      const result = await res.json();
      return { request: result.request, isOfflineQueued: false };
    } catch (err) {
      console.warn('Server unreachable. Falling back to offline queue:', err);
      const queued = await queueOfflineRequest(data);
      return {
        request: queued.data as EmergencyRequest,
        isOfflineQueued: true
      };
    }
  },

  async submitResourceRequest(data: Partial<EmergencyRequest>): Promise<{ request: EmergencyRequest; isOfflineQueued?: boolean }> {
    if (!navigator.onLine) {
      const queued = await queueOfflineRequest({ ...data, request_type: 'RESOURCE' });
      return { request: queued.data as EmergencyRequest, isOfflineQueued: true };
    }

    try {
      const res = await fetch(`${API_BASE}/api/requests/resource`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Network response not ok');
      const result = await res.json();
      return { request: result.request, isOfflineQueued: false };
    } catch (err) {
      const queued = await queueOfflineRequest({ ...data, request_type: 'RESOURCE' });
      return { request: queued.data as EmergencyRequest, isOfflineQueued: true };
    }
  },

  async updateRequestStatus(id: string, status: string, changedBy: string = 'User', notes: string = ''): Promise<EmergencyRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, changed_by: changedBy, notes })
    });
    if (!res.ok) throw new Error('Failed to update status');
    const data = await res.json();
    return data.request;
  },

  async getMatches(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/requests/${id}/matches`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  async assignRequest(id: string, assignedTo: { id: string; name: string; role: string }): Promise<EmergencyRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${id}/assign`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assigned_to: assignedTo })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to assign request');
    }
    const data = await res.json();
    return data.request;
  },

  /**
   * Responder accepts an assigned task — only updates status to ACCEPTED.
   * The task must already be assigned to this responder.
   */
  async acceptTask(requestId: string, responderName: string): Promise<EmergencyRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'ACCEPTED',
        changed_by: responderName,
        notes: 'Responder acknowledged and accepted the task'
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to accept task');
    }
    const data = await res.json();
    return data.request;
  },

  // Responders & Volunteers
  async getResponders(): Promise<Responder[]> {
    const res = await fetch(`${API_BASE}/api/responders`);
    if (!res.ok) throw new Error('Failed to fetch responders');
    const data = await res.json();
    return data.responders;
  },

  async getVolunteers(): Promise<Volunteer[]> {
    const res = await fetch(`${API_BASE}/api/volunteers`);
    if (!res.ok) throw new Error('Failed to fetch volunteers');
    const data = await res.json();
    return data.volunteers;
  },

  async volunteerAcceptRequest(volunteerId: string, requestId: string): Promise<EmergencyRequest> {
    const res = await fetch(`${API_BASE}/api/volunteers/${volunteerId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId })
    });
    if (!res.ok) throw new Error('Failed to accept request');
    const data = await res.json();
    return data.request;
  },

  async updateResponderLocation(responderId: string, location: { latitude: number; longitude: number; is_available?: boolean }): Promise<void> {
    await fetch(`${API_BASE}/api/responders/${responderId}/location`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(location)
    });
  },

  async updateVolunteerLocation(volunteerId: string, location: { latitude: number; longitude: number; is_available?: boolean }): Promise<void> {
    await fetch(`${API_BASE}/api/volunteers/${volunteerId}/location`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(location)
    });
  },

  // Dashboard Stats & Facilities
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/api/dashboard/statistics`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    return data.statistics;
  },

  async getFacilities(): Promise<{ shelters: Facility[]; hospitals: Facility[]; policeStations: Facility[] }> {
    const res = await fetch(`${API_BASE}/api/dashboard/facilities`);
    if (!res.ok) throw new Error('Failed to fetch facilities');
    return res.json();
  },

  async getDisasterEvent(): Promise<DisasterEvent> {
    const res = await fetch(`${API_BASE}/api/dashboard/disaster-event`);
    if (!res.ok) throw new Error('Failed to fetch disaster event');
    const data = await res.json();
    return data.event;
  },

  async triggerSync(): Promise<{ synced: number; failed: number }> {
    return syncOfflineQueue(API_BASE);
  },

  // Task Help / Issue Reporting
  async submitTaskReport(requestId: string, data: {
    reported_by_user_id?: string;
    reporter_name: string;
    reporter_role: string;
    issue_type: string;
    description: string;
    latitude?: number;
    longitude?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/reports`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit task report');
    }
    return res.json();
  },

  async getTaskReports(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE}/api/reports/all${query}`);
    if (!res.ok) throw new Error('Failed to fetch task reports');
    const data = await res.json();
    return data.reports || [];
  },

  async updateTaskReportStatus(reportId: string, status: string, resolvedBy?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolved_by: resolvedBy })
    });
    if (!res.ok) throw new Error('Failed to update task report status');
    return res.json();
  },

  // Multiple Personnel Assignment & Reassignment
  async assignSupport(requestId: string, personnelId: string, role?: string, assignedBy?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/assign-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personnel_id: personnelId, role: role || 'VOLUNTEER', assigned_by: assignedBy || 'Admin' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign support personnel');
    }
    return res.json();
  },

  async reassignTask(requestId: string, personnelId: string, role?: string, reason?: string, assignedBy?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personnel_id: personnelId, role: role || 'VOLUNTEER', reason, assigned_by: assignedBy || 'Admin' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reassign task');
    }
    return res.json();
  },

  // Nearby Hospitals & Police Stations using Real GPS Coordinates
  async getNearbyFacilities(latitude: number, longitude: number, radiusKm: number = 15): Promise<{ hospitals: any[]; police_stations: any[] }> {
    const [hRes, pRes] = await Promise.all([
      fetch(`${API_BASE}/api/facilities/nearby?type=hospitals&latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`),
      fetch(`${API_BASE}/api/facilities/nearby?type=police_stations&latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`)
    ]);
    const hData = hRes.ok ? await hRes.json() : { facilities: [] };
    const pData = pRes.ok ? await pRes.json() : { facilities: [] };
    return {
      hospitals: hData.facilities || [],
      police_stations: pData.facilities || []
    };
  }
};
