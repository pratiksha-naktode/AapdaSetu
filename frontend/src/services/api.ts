import { EmergencyRequest, DashboardStats, DisasterEvent, Facility, Responder, Volunteer } from '../types';
import { queueOfflineRequest, syncOfflineQueue } from './offlineStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = {
  // Requests
  async getRequests(params?: { type?: string; status?: string; priority?: string }): Promise<EmergencyRequest[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/api/requests${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    const data = await res.json();
    return data.requests;
  },

  async getRequestById(id: string): Promise<{ request: EmergencyRequest; matchingCandidates: any[] }> {
    const res = await fetch(`${API_BASE}/api/requests/${id}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changed_by: changedBy, notes })
    });
    if (!res.ok) throw new Error('Failed to update status');
    const data = await res.json();
    return data.request;
  },

  async assignRequest(id: string, assignedTo: { id: string; name: string; role: string }): Promise<EmergencyRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assignedTo })
    });
    if (!res.ok) throw new Error('Failed to assign request');
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
  }
};
