import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

let supabase = null;
if (config.supabase.url && config.supabase.anonKey) {
  try {
    supabase = createClient(config.supabase.url, config.supabase.anonKey);
    console.log('[Repository] Connected to Supabase PostgreSQL at:', config.supabase.url);
  } catch (err) {
    console.warn('[Repository] Failed to connect to Supabase, running local in-memory store:', err.message);
  }
} else {
  console.log('[Repository] No Supabase credentials provided. Running in high-fidelity local memory store.');
}

// Pre-seeded disaster state for Bhimavaram Flood Scenario
const memoryStore = {
  disasterEvent: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Heavy Flooding — Bhimavaram',
    disaster_type: 'Flood / Flash Flood',
    severity: 'Severe',
    latitude: 16.5449,
    longitude: 81.5212,
    radius_km: 20.0,
    status: 'ACTIVE',
    description: 'Yenamadurru Drain and Godavari canal breach causing widespread inundation across low-lying wards of Bhimavaram town.'
  },
  users: [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'admin@varahi.gov.in', phone: '+919876543200', full_name: 'Bhimavaram District Control Room', role: 'ADMIN', avatar_url: null },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', email: 'ndrf.alpha@varahi.gov.in', phone: '+919876543201', full_name: 'NDRF Rescue Unit Alpha (Capt. Rajesh)', role: 'RESPONDER', avatar_url: null },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', email: 'police.town@varahi.gov.in', phone: '+919876543202', full_name: '1-Town Police Quick Response (Insp. Satya)', role: 'RESPONDER', avatar_url: null },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', email: 'medical.ems@varahi.gov.in', phone: '+919876543203', full_name: 'Mobile Medical EMS Unit (Dr. Kavitha)', role: 'RESPONDER', avatar_url: null },
    { id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1', email: 'ramesh.med@volunteer.in', phone: '+919876543211', full_name: 'Ramesh Varma', role: 'VOLUNTEER', avatar_url: null },
    { id: 'cccccccc-cccc-cccc-cccc-ccccccccccc2', email: 'suresh.food@volunteer.in', phone: '+919876543212', full_name: 'Suresh Kumar', role: 'VOLUNTEER', avatar_url: null },
    { id: 'cccccccc-cccc-cccc-cccc-ccccccccccc3', email: 'lakshmi.relief@volunteer.in', phone: '+919876543213', full_name: 'Lakshmi Devi', role: 'VOLUNTEER', avatar_url: null },
    { id: 'dddddddd-dddd-dddd-dddd-ddddddddddd1', email: 'citizen@varahi.org', phone: '+919876543221', full_name: 'Citizen User', role: 'CITIZEN', avatar_url: null }
  ],
  responders: [
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      name: 'NDRF Rescue Unit Alpha (Capt. Rajesh)',
      badge_number: 'NDRF-AP-04',
      responder_type: 'RESCUE_TEAM',
      latitude: 16.5410,
      longitude: 81.5240,
      is_available: true,
      phone: '+919876543201',
      active_assignments_count: 0
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      name: '1-Town Police Quick Response (Insp. Satya)',
      badge_number: 'AP-POLICE-108',
      responder_type: 'POLICE',
      latitude: 16.5480,
      longitude: 81.5285,
      is_available: true,
      phone: '+919876543202',
      active_assignments_count: 0
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      name: 'Mobile Medical EMS Unit (Dr. Kavitha)',
      badge_number: 'EMS-AMB-02',
      responder_type: 'MEDICAL_TEAM',
      latitude: 16.5430,
      longitude: 81.5180,
      is_available: true,
      phone: '+919876543203',
      active_assignments_count: 0
    }
  ],
  volunteers: [
    {
      id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
      user_id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
      name: 'Ramesh Varma',
      phone: '+919876543211',
      latitude: 16.5470,
      longitude: 81.5220,
      vehicle_type: 'Two Wheeler',
      is_available: true,
      capabilities: ['MEDICINE', 'FIRST_AID']
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
      user_id: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
      name: 'Suresh Kumar',
      phone: '+919876543212',
      latitude: 16.5390,
      longitude: 81.5300,
      vehicle_type: 'Utility Van',
      is_available: true,
      capabilities: ['FOOD', 'WATER', 'TRANSPORTATION']
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-ccccccccccc3',
      user_id: 'cccccccc-cccc-cccc-cccc-ccccccccccc3',
      name: 'Lakshmi Devi',
      phone: '+919876543213',
      latitude: 16.5495,
      longitude: 81.5150,
      vehicle_type: '4x4 Jeep',
      is_available: true,
      capabilities: ['GENERAL_ASSISTANCE', 'RESCUE_SUPPORT', 'FOOD']
    }
  ],
  shelters: [
    { id: 's1', name: 'DNR College Flood Relief Camp', latitude: 16.5435, longitude: 81.5315, capacity: 500, current_occupancy: 0, contact_phone: '+918816223344', status: 'OPEN' },
    { id: 's2', name: 'Municipal High School Relief Shelter', latitude: 16.5460, longitude: 81.5160, capacity: 300, current_occupancy: 0, contact_phone: '+918816225566', status: 'OPEN' }
  ],
  hospitals: [
    { id: 'h1', name: 'Bhimavaram Area District Hospital', latitude: 16.5385, longitude: 81.5265, icu_beds_available: 14, ambulance_available: 4, contact_phone: '+918816227788' },
    { id: 'h2', name: 'Surya Emergency Care Hospital', latitude: 16.5510, longitude: 81.5190, icu_beds_available: 8, ambulance_available: 2, contact_phone: '+918816229900' }
  ],
  policeStations: [
    { id: 'p1', name: '1-Town Police Station Bhimavaram', latitude: 16.5480, longitude: 81.5285, control_room_number: '+918816221100' }
  ],
  requests: [],
  statusHistory: []
};

export const repository = {
  getDisasterEvent() {
    return memoryStore.disasterEvent;
  },

  getFacilities() {
    return {
      shelters: memoryStore.shelters,
      hospitals: memoryStore.hospitals,
      policeStations: memoryStore.policeStations
    };
  },

  getResponders() {
    return memoryStore.responders;
  },

  getVolunteers() {
    return memoryStore.volunteers;
  },

  getRequests({ type, status, priority } = {}) {
    let list = [...memoryStore.requests];
    if (type) list = list.filter(r => r.request_type.toUpperCase() === type.toUpperCase());
    if (status) list = list.filter(r => r.status.toUpperCase() === status.toUpperCase());
    if (priority) list = list.filter(r => r.priority_level.toUpperCase() === priority.toUpperCase());
    
    // Sort by priority_score descending, then created_at descending
    return list.sort((a, b) => b.priority_score - a.priority_score || new Date(b.created_at) - new Date(a.created_at));
  },

  getRequestById(id) {
    return memoryStore.requests.find(r => r.id === id || r.client_local_id === id) || null;
  },

  createRequest(data) {
    // Deduplication check for offline-first sync
    if (data.client_local_id) {
      const existing = memoryStore.requests.find(r => r.client_local_id === data.client_local_id);
      if (existing) {
        console.log(`[Repository] Deduplicating request with client_local_id: ${data.client_local_id}`);
        return { request: existing, isDuplicate: true };
      }
    }

    const newRequest = {
      id: data.id || uuidv4(),
      client_local_id: data.client_local_id || null,
      citizen_id: data.citizen_id || 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
      citizen_name: data.citizen_name || 'Anonymous Citizen',
      citizen_phone: data.citizen_phone || '+919999999999',
      request_type: (data.request_type || 'emergency').toUpperCase(),
      category: data.category || 'general',
      people_count: Number(data.people_count || 1),
      child_present: Boolean(data.child_present),
      elderly_present: Boolean(data.elderly_present),
      injured: Boolean(data.injured),
      medical_emergency: Boolean(data.medical_emergency),
      trapped: Boolean(data.trapped),
      life_threat: Boolean(data.life_threat),
      requested_resource: data.requested_resource || null,
      description: data.description || '',
      image_url: data.image_url || null,
      damage_severity: data.damage_severity || null,
      latitude: Number(data.latitude || 16.5449),
      longitude: Number(data.longitude || 81.5212),
      address: data.address || 'Bhimavaram Area',
      priority_score: data.priority_score || 50,
      priority_level: data.priority_level || 'MEDIUM',
      priority_reason: data.priority_reason || 'Standard priority',
      recommended_responder: data.recommended_responder || 'RESCUE_TEAM',
      status: 'PENDING',
      assigned_to: null,
      assigned_responder_type: null,
      is_offline_captured: Boolean(data.is_offline_captured),
      synced_at: data.is_offline_captured ? new Date().toISOString() : null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.requests.unshift(newRequest);
    return { request: newRequest, isDuplicate: false };
  },

  updateRequestStatus(id, newStatus, changedBy = 'System', notes = '') {
    const request = this.getRequestById(id);
    if (!request) return null;

    const previousStatus = request.status;
    request.status = newStatus;
    request.updated_at = new Date().toISOString();
    if (newStatus === 'RESOLVED') {
      request.resolved_at = new Date().toISOString();
    }

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: request.id,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes,
      timestamp: new Date().toISOString()
    });

    return request;
  },

  assignRequest(id, assignedTo) {
    const request = this.getRequestById(id);
    if (!request) return null;

    request.assigned_to = assignedTo;
    request.status = 'ASSIGNED';
    request.updated_at = new Date().toISOString();

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: request.id,
      previous_status: 'PENDING',
      new_status: 'ASSIGNED',
      changed_by: assignedTo.name || 'Admin',
      notes: `Assigned to ${assignedTo.name}`,
      timestamp: new Date().toISOString()
    });

    return request;
  },

  getStats() {
    const requests = memoryStore.requests;
    return {
      total_requests: requests.length,
      critical_requests: requests.filter(r => r.priority_level === 'CRITICAL' && r.status !== 'RESOLVED').length,
      high_requests: requests.filter(r => r.priority_level === 'HIGH' && r.status !== 'RESOLVED').length,
      medium_requests: requests.filter(r => r.priority_level === 'MEDIUM' && r.status !== 'RESOLVED').length,
      low_requests: requests.filter(r => r.priority_level === 'LOW' && r.status !== 'RESOLVED').length,
      emergency_requests: requests.filter(r => r.request_type === 'EMERGENCY').length,
      resource_requests: requests.filter(r => r.request_type === 'RESOURCE').length,
      resolved_requests: requests.filter(r => r.status === 'RESOLVED').length,
      pending_requests: requests.filter(r => r.status === 'PENDING').length,
      in_progress_requests: requests.filter(r => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'RESCUE_IN_PROGRESS', 'DELIVERY_IN_PROGRESS'].includes(r.status)).length,
      active_responders: memoryStore.responders.filter(r => r.is_available).length,
      active_volunteers: memoryStore.volunteers.filter(v => v.is_available).length
    };
  },

  getUserById(id) {
    return memoryStore.users.find(u => u.id === id) || null;
  },

  getAllUsers() {
    return memoryStore.users;
  },

  updateUserProfile(id, updates = {}) {
    let user = memoryStore.users.find(u => u.id === id);
    if (!user) {
      // Create user record if not exists
      user = {
        id,
        email: updates.email || 'citizen@varahi.org',
        full_name: updates.full_name || 'Citizen User',
        phone: updates.phone || '+919999999999',
        role: updates.role || 'CITIZEN',
        avatar_url: updates.avatar_url || null
      };
      memoryStore.users.push(user);
    } else {
      if (updates.full_name !== undefined) user.full_name = updates.full_name;
      if (updates.phone !== undefined) user.phone = updates.phone;
      if (updates.email !== undefined) user.email = updates.email;
      if (updates.avatar_url !== undefined) user.avatar_url = updates.avatar_url;
      if (updates.role !== undefined) user.role = updates.role;
    }
    return user;
  }
};

