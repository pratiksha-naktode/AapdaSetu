import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { 
  matchRequestCandidates, 
  determineRequiredResponderType, 
  determineRequiredCapability,
  calculateDistanceKm,
  findBestVolunteerForResourceRequest,
  findBestResponderForEmergencyRequest
} from '../services/matchingService.js';

let supabase = null;
let supabaseAuth = null;
if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
  try {
    const serviceKey = config.supabase.serviceRoleKey || config.supabase.anonKey;
    const anonKey = config.supabase.anonKey || config.supabase.serviceRoleKey;
    supabase = createClient(config.supabase.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    supabaseAuth = createClient(config.supabase.url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
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
  statusHistory: [],
  taskReports: [],
  requestAssignments: []
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

  async getResponders() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('responders')
          .select('*, users(id, full_name, phone, email, avatar_url, role)');
        if (!error && data && data.length > 0) {
          return data.map(r => ({
            id: r.id,
            user_id: r.id,
            name: r.users?.full_name || 'Rescue Personnel',
            phone: r.users?.phone || '',
            email: r.users?.email || '',
            avatar_url: r.users?.avatar_url || null,
            badge_number: r.badge_number,
            responder_type: r.responder_type,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            is_available: r.is_available !== false,
            active_assignments_count: r.active_assignments_count || 0
          }));
        }
      } catch (err) {
        console.warn('[Repository] Supabase getResponders error, using fallback:', err.message);
      }
    }
    return memoryStore.responders;
  },

  async getVolunteers() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*, users(id, full_name, phone, email, avatar_url, role), volunteer_capabilities(capability)');
        if (!error && data && data.length > 0) {
          return data.map(v => ({
            id: v.id,
            user_id: v.id,
            name: v.users?.full_name || 'Volunteer Personnel',
            phone: v.users?.phone || '',
            email: v.users?.email || '',
            avatar_url: v.users?.avatar_url || null,
            latitude: Number(v.latitude),
            longitude: Number(v.longitude),
            vehicle_type: v.vehicle_type,
            is_available: v.is_available !== false,
            capabilities: (v.volunteer_capabilities || []).map(c => c.capability)
          }));
        }
      } catch (err) {
        console.warn('[Repository] Supabase getVolunteers error, using fallback:', err.message);
      }
    }
    return memoryStore.volunteers;
  },

  async updateResponderLocation(id, { latitude, longitude, is_available } = {}) {
    let responder = memoryStore.responders.find(r => r.id === id || r.user_id === id);
    if (responder) {
      if (latitude !== undefined && latitude !== null) responder.latitude = Number(latitude);
      if (longitude !== undefined && longitude !== null) responder.longitude = Number(longitude);
      if (is_available !== undefined) responder.is_available = Boolean(is_available);
    }
    if (supabase && typeof id === 'string' && id.length === 36 && id.includes('-')) {
      try {
        const updateData = {};
        if (latitude !== undefined && latitude !== null) updateData.latitude = Number(latitude);
        if (longitude !== undefined && longitude !== null) updateData.longitude = Number(longitude);
        if (is_available !== undefined) updateData.is_available = Boolean(is_available);
        if (Object.keys(updateData).length > 0) {
          await supabase.from('responders').update(updateData).eq('id', id);
        }
      } catch (err) {
        console.warn('[Repository] Supabase updateResponderLocation warning:', err.message);
      }
    }
    return responder;
  },

  async updateVolunteerLocation(id, { latitude, longitude, is_available } = {}) {
    let volunteer = memoryStore.volunteers.find(v => v.id === id || v.user_id === id);
    if (volunteer) {
      if (latitude !== undefined && latitude !== null) volunteer.latitude = Number(latitude);
      if (longitude !== undefined && longitude !== null) volunteer.longitude = Number(longitude);
      if (is_available !== undefined) volunteer.is_available = Boolean(is_available);
    }
    if (supabase && typeof id === 'string' && id.length === 36 && id.includes('-')) {
      try {
        const updateData = {};
        if (latitude !== undefined && latitude !== null) updateData.latitude = Number(latitude);
        if (longitude !== undefined && longitude !== null) updateData.longitude = Number(longitude);
        if (is_available !== undefined) updateData.is_available = Boolean(is_available);
        if (Object.keys(updateData).length > 0) {
          await supabase.from('volunteers').update(updateData).eq('id', id);
        }
      } catch (err) {
        console.warn('[Repository] Supabase updateVolunteerLocation warning:', err.message);
      }
    }
    return volunteer;
  },

  async enrichRequests(list) {
    if (!list || list.length === 0) return [];
    const responders = await this.getResponders();
    const volunteers = await this.getVolunteers();
    const activeMap = await this.getActiveAssignmentsMap();

    return list.map(req => {
      let assignedTo = req.assigned_to;
      if (!assignedTo && req.assigned_to_user_id) {
        const found = responders.find(r => r.id === req.assigned_to_user_id || r.user_id === req.assigned_to_user_id)
          || volunteers.find(v => v.id === req.assigned_to_user_id || v.user_id === req.assigned_to_user_id);
        assignedTo = {
          id: req.assigned_to_user_id,
          name: found ? (found.name || found.full_name) : 'Assigned Personnel',
          role: req.assigned_responder_type || (found ? (found.responder_type || found.role) : 'RESPONDER')
        };
      }

      const recType = determineRequiredResponderType(req);
      const pool = recType === 'VOLUNTEER' ? volunteers : responders;
      const matchResult = matchRequestCandidates(req, pool, activeMap);

      const reqAssignments = memoryStore.requestAssignments.filter(a => a.request_id === req.id && a.status !== 'CANCELLED');
      const supportList = reqAssignments.filter(a => a.assignment_role === 'SUPPORT').map(a => {
        const found = responders.find(r => r.id === a.assigned_to_user_id || r.user_id === a.assigned_to_user_id)
          || volunteers.find(v => v.id === a.assigned_to_user_id || v.user_id === a.assigned_to_user_id);
        return {
          ...a,
          name: found ? (found.name || found.full_name) : 'Support Personnel',
          phone: found ? found.phone : ''
        };
      });

      return {
        ...req,
        assigned_to: assignedTo || null,
        support_assignments: supportList,
        assignment_method: req.assignment_method || (assignedTo ? 'MANUAL_DISPATCH' : null),
        assignment_explanation: req.assignment_explanation || null,
        matching: matchResult,
        recommended_responder: recType
      };
    });
  },

  async getRequests({ type, status, priority } = {}) {
    let list = null;
    if (supabase) {
      try {
        let query = supabase.from('emergency_requests').select('*');
        if (type) query = query.eq('request_type', type.toUpperCase());
        if (status) query = query.eq('status', status.toUpperCase());
        if (priority) query = query.eq('priority_level', priority.toUpperCase());
        query = query.order('priority_score', { ascending: false }).order('created_at', { ascending: false });
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          list = data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getRequests error, using memoryStore:', err.message);
      }
    }
    if (list === null) {
      list = [...memoryStore.requests];
      if (type) list = list.filter(r => r.request_type.toUpperCase() === type.toUpperCase());
      if (status) list = list.filter(r => r.status.toUpperCase() === status.toUpperCase());
      if (priority) list = list.filter(r => r.priority_level.toUpperCase() === priority.toUpperCase());
      list.sort((a, b) => b.priority_score - a.priority_score || new Date(b.created_at) - new Date(a.created_at));
    }
    return this.enrichRequests(list);
  },

  async getRequestById(id) {
    let req = null;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('emergency_requests').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          req = data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getRequestById error:', err.message);
      }
    }
    if (!req) {
      req = memoryStore.requests.find(r => r.id === id || r.client_local_id === id) || null;
    }
    if (!req) return null;
    const [enriched] = await this.enrichRequests([req]);
    return enriched;
  },

  async createRequest(data) {
    // Deduplication check for offline-first sync
    if (data.client_local_id) {
      const existing = memoryStore.requests.find(r => r.client_local_id === data.client_local_id);
      if (existing) {
        console.log(`[Repository] Deduplicating request with client_local_id: ${data.client_local_id}`);
        return { request: existing, isDuplicate: true };
      }
    }

    const lat = Number(data.latitude || 16.5449);
    const lon = Number(data.longitude || 81.5212);

    const newRequest = {
      id: data.id || uuidv4(),
      client_local_id: data.client_local_id || null,
      citizen_id: data.citizen_id || null,
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
      latitude: lat,
      longitude: lon,
      address: data.address || 'Bhimavaram Area',
      priority_score: data.priority_score || 50,
      priority_level: data.priority_level || 'MEDIUM',
      priority_reason: data.priority_reason || 'Standard priority',
      recommended_responder: data.recommended_responder || 'RESCUE_TEAM',
      status: 'PENDING',
      assigned_to: null,
      assigned_to_user_id: null,
      assigned_responder_type: null,
      assignment_method: null,
      assignment_explanation: null,
      is_offline_captured: Boolean(data.is_offline_captured),
      synced_at: data.is_offline_captured ? new Date().toISOString() : null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Automatic Nearest Responder Assignment for EMERGENCY requests
    let autoAssignedResponder = null;
    if (newRequest.request_type === 'EMERGENCY') {
      const responders = await this.getResponders();
      const activeMap = await this.getActiveAssignmentsMap();
      const matchResult = findBestResponderForEmergencyRequest(newRequest, responders, activeMap);

      if (matchResult.is_assigned && matchResult.responder) {
        autoAssignedResponder = matchResult.responder;
        newRequest.status = 'ASSIGNED';
        newRequest.assigned_to_user_id = autoAssignedResponder.id || autoAssignedResponder.user_id;
        newRequest.assigned_to = {
          id: autoAssignedResponder.id || autoAssignedResponder.user_id,
          name: autoAssignedResponder.name || autoAssignedResponder.full_name,
          role: 'RESPONDER'
        };
        newRequest.assigned_responder_type = autoAssignedResponder.responder_type || 'RESCUE_TEAM';
        newRequest.assigned_at = new Date().toISOString();
        newRequest.assignment_method = 'AUTO — NEAREST AVAILABLE RESPONDER';
        newRequest.assignment_explanation = matchResult.explanation;
        newRequest.responder_distance_km = matchResult.distance_km;
        newRequest.responder_active_tasks = matchResult.active_tasks;
      } else {
        newRequest.status = 'PENDING';
        newRequest.assignment_method = 'PENDING — NO AVAILABLE RESPONDER';
        newRequest.assignment_explanation = matchResult.explanation;
      }
    }

    // Automatic Nearest Volunteer Assignment for RESOURCE requests
    let autoAssignedVolunteer = null;
    if (newRequest.request_type === 'RESOURCE') {
      const volunteers = await this.getVolunteers();
      const activeMap = await this.getActiveAssignmentsMap();
      const matchResult = findBestVolunteerForResourceRequest(newRequest, volunteers, activeMap);

      if (matchResult.is_assigned && matchResult.volunteer) {
        autoAssignedVolunteer = matchResult.volunteer;
        newRequest.status = 'ASSIGNED';
        newRequest.assigned_to_user_id = autoAssignedVolunteer.id || autoAssignedVolunteer.user_id;
        newRequest.assigned_to = {
          id: autoAssignedVolunteer.id || autoAssignedVolunteer.user_id,
          name: autoAssignedVolunteer.name || autoAssignedVolunteer.full_name,
          role: 'VOLUNTEER'
        };
        newRequest.assigned_responder_type = 'VOLUNTEER';
        newRequest.assigned_at = new Date().toISOString();
        newRequest.assignment_method = 'AUTO — NEAREST AVAILABLE VOLUNTEER';
        newRequest.assignment_explanation = matchResult.explanation;
        newRequest.volunteer_distance_km = matchResult.distance_km;
        newRequest.volunteer_active_tasks = matchResult.active_tasks;
      } else {
        newRequest.status = 'PENDING';
        newRequest.assignment_method = 'PENDING — NO AVAILABLE VOLUNTEER';
        newRequest.assignment_explanation = matchResult.explanation;
      }
    }

    memoryStore.requests.unshift(newRequest);

    if (supabase) {
      try {
        const isCitizenUuid = typeof newRequest.citizen_id === 'string' && newRequest.citizen_id.length === 36 && newRequest.citizen_id.includes('-');
        const isAssigneeUuid = typeof newRequest.assigned_to_user_id === 'string' && newRequest.assigned_to_user_id.length === 36 && newRequest.assigned_to_user_id.includes('-');

        const { data: dbData, error } = await supabase.from('emergency_requests').insert({
          id: newRequest.id,
          client_local_id: newRequest.client_local_id,
          citizen_id: isCitizenUuid ? newRequest.citizen_id : null,
          citizen_name: newRequest.citizen_name,
          citizen_phone: newRequest.citizen_phone,
          request_type: newRequest.request_type,
          category: newRequest.category,
          people_count: newRequest.people_count,
          child_present: newRequest.child_present,
          elderly_present: newRequest.elderly_present,
          injured: newRequest.injured,
          medical_emergency: newRequest.medical_emergency,
          trapped: newRequest.trapped,
          life_threat: newRequest.life_threat,
          requested_resource: newRequest.requested_resource,
          description: newRequest.description,
          image_url: newRequest.image_url,
          damage_severity: newRequest.damage_severity,
          location: `POINT(${lon} ${lat})`,
          latitude: lat,
          longitude: lon,
          address: newRequest.address,
          priority_score: newRequest.priority_score,
          priority_level: newRequest.priority_level,
          priority_reason: newRequest.priority_reason,
          recommended_responder: newRequest.recommended_responder,
          status: newRequest.status,
          assigned_to_user_id: isAssigneeUuid ? newRequest.assigned_to_user_id : null,
          assigned_at: newRequest.assigned_at || null,
          is_offline_captured: newRequest.is_offline_captured,
          synced_at: newRequest.synced_at
        }).select().maybeSingle();

        if (error) {
          console.warn('[Repository] Supabase insert warning:', error.message);
        } else if (dbData) {
          newRequest.created_at = dbData.created_at;
          newRequest.updated_at = dbData.updated_at;
        }
      } catch (dbErr) {
        console.warn('[Repository] Supabase insert failed, fallback stored in memory:', dbErr.message);
      }
    }

    // If auto-assigned responder, record in request_assignments and request_status_history
    if (autoAssignedResponder) {
      const respId = autoAssignedResponder.id || autoAssignedResponder.user_id;
      await this.recordAssignment({
        request_id: newRequest.id,
        assigned_to_user_id: respId,
        assignment_role: 'PRIMARY',
        status: 'ASSIGNED',
        assigned_by_user_id: null
      });

      if (supabase) {
        const isUuid = respId && respId.length === 36 && respId.includes('-');
        try {
          await supabase.from('request_status_history').insert({
            request_id: newRequest.id,
            previous_status: 'PENDING',
            new_status: 'ASSIGNED',
            changed_by_user_id: isUuid ? respId : null,
            notes: newRequest.assignment_explanation,
            changed_at: newRequest.assigned_at
          });
        } catch (hErr) {
          console.warn('[Repository] Supabase auto-assignment status history warning:', hErr.message);
        }
      }

      memoryStore.statusHistory.unshift({
        id: uuidv4(),
        request_id: newRequest.id,
        previous_status: 'PENDING',
        new_status: 'ASSIGNED',
        changed_by: 'Auto Responder Dispatch Engine',
        notes: newRequest.assignment_explanation,
        timestamp: newRequest.assigned_at
      });
    }

    // If auto-assigned, record in request_assignments and request_status_history
    if (autoAssignedVolunteer) {
      await this.recordAssignment({
        request_id: newRequest.id,
        assigned_to_user_id: autoAssignedVolunteer.id,
        assignment_role: 'PRIMARY',
        status: 'ASSIGNED',
        assigned_by_user_id: null
      });

      if (supabase) {
        const isUuid = autoAssignedVolunteer.id && autoAssignedVolunteer.id.length === 36 && autoAssignedVolunteer.id.includes('-');
        try {
          await supabase.from('request_status_history').insert({
            request_id: newRequest.id,
            previous_status: 'PENDING',
            new_status: 'ASSIGNED',
            changed_by_user_id: isUuid ? autoAssignedVolunteer.id : null,
            notes: newRequest.assignment_explanation,
            changed_at: newRequest.assigned_at
          });
        } catch (hErr) {
          console.warn('[Repository] Supabase auto-assignment status history warning:', hErr.message);
        }
      }

      memoryStore.statusHistory.unshift({
        id: uuidv4(),
        request_id: newRequest.id,
        previous_status: 'PENDING',
        new_status: 'ASSIGNED',
        changed_by: 'Auto Volunteer Dispatch Engine',
        notes: newRequest.assignment_explanation,
        timestamp: newRequest.assigned_at
      });
    }

    return { request: newRequest, isDuplicate: false };
  },

  async deleteRequest(id) {
    const index = memoryStore.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      memoryStore.requests.splice(index, 1);
    }
    if (supabase) {
      try {
        await supabase.from('emergency_requests').delete().eq('id', id);
      } catch (err) {
        console.warn('[Repository] Supabase delete error:', err.message);
      }
    }
    return true;
  },

  async updateRequestStatus(id, newStatus, changedBy = 'System', notes = '', changedByUserId = null) {
    let request = memoryStore.requests.find(r => r.id === id || r.client_local_id === id);

    // If not in memory store, fetch from Supabase
    if (!request && supabase && typeof id === 'string' && id.length === 36 && id.includes('-')) {
      try {
        const { data, error } = await supabase.from('emergency_requests').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          request = data;
          memoryStore.requests.unshift(request);
        }
      } catch (err) {
        console.warn('[Repository] Supabase getRequest in updateRequestStatus error:', err.message);
      }
    }

    if (!request) return null;

    const previousStatus = request.status;
    const nowIso = new Date().toISOString();
    request.status = newStatus;
    request.updated_at = nowIso;

    if (newStatus === 'RESOLVED') {
      request.resolved_at = request.resolved_at || nowIso;
    }

    if (supabase && typeof id === 'string' && id.length === 36 && id.includes('-')) {
      try {
        const updatePayload = {
          status: newStatus,
          updated_at: nowIso
        };
        if (newStatus === 'RESOLVED') {
          updatePayload.resolved_at = request.resolved_at || nowIso;
        }

        const { error: reqUpdateErr } = await supabase.from('emergency_requests').update(updatePayload).eq('id', id);
        if (reqUpdateErr) {
          console.warn('[Repository] Supabase update emergency_requests error:', reqUpdateErr.message);
        }

        const isUserUuid = typeof changedByUserId === 'string' && changedByUserId.length === 36 && changedByUserId.includes('-');

        await supabase.from('request_status_history').insert({
          request_id: request.id,
          previous_status: previousStatus,
          new_status: newStatus,
          changed_by_user_id: isUserUuid ? changedByUserId : null,
          notes: notes || `Status changed to ${newStatus} by ${changedBy}`,
          changed_at: nowIso
        });

        // Also update request_assignments if exists
        const assignmentUpdate = {
          status: newStatus,
          updated_at: nowIso
        };
        if (newStatus === 'ACCEPTED') {
          assignmentUpdate.accepted_at = nowIso;
        }
        if (newStatus === 'RESOLVED') {
          assignmentUpdate.completed_at = nowIso;
        }

        await supabase.from('request_assignments').update(assignmentUpdate).eq('request_id', id);
      } catch (err) {
        console.warn('[Repository] Supabase updateRequestStatus warning:', err.message);
      }
    }

    // Also update in-memory requestAssignments
    memoryStore.requestAssignments
      .filter(a => a.request_id === id)
      .forEach(a => {
        a.status = newStatus;
        if (newStatus === 'ACCEPTED' && !a.accepted_at) a.accepted_at = nowIso;
        if (newStatus === 'RESOLVED' && !a.completed_at) a.completed_at = nowIso;
        a.updated_at = nowIso;
      });

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: request.id,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes: notes || `Status changed to ${newStatus} by ${changedBy}`,
      timestamp: nowIso
    });

    const [enriched] = await this.enrichRequests([request]);
    return enriched || request;
  },

  async getActiveAssignmentsMap() {
    const activeMap = {};
    const countedRequestIds = new Set();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('emergency_requests')
          .select('id, assigned_to_user_id, status')
          .not('assigned_to_user_id', 'is', null);
        if (!error && data) {
          data.forEach(r => {
            if (r.assigned_to_user_id && !['RESOLVED', 'CANCELLED'].includes((r.status || '').toUpperCase())) {
              countedRequestIds.add(r.id);
              activeMap[r.assigned_to_user_id] = (activeMap[r.assigned_to_user_id] || 0) + 1;
            }
          });
        }
      } catch (err) {
        console.warn('[Repository] Error querying active assignments from Supabase:', err.message);
      }
    }

    // Include in-memory active assignments not already counted from Supabase
    memoryStore.requests
      .filter(r => (r.assigned_to_user_id || (r.assigned_to && r.assigned_to.id)) && !['RESOLVED', 'CANCELLED'].includes((r.status || '').toUpperCase()))
      .forEach(r => {
        if (!countedRequestIds.has(r.id)) {
          const uid = r.assigned_to_user_id || r.assigned_to?.id;
          if (uid) {
            activeMap[uid] = (activeMap[uid] || 0) + 1;
          }
        }
      });

    return activeMap;
  },

  async getMatchesForRequest(requestId) {
    const request = await this.getRequestById(requestId);
    if (!request) return null;

    let candidates = [];
    if (request.request_type === 'EMERGENCY') {
      candidates = await this.getResponders();
    } else {
      candidates = await this.getVolunteers();
    }

    const activeMap = await this.getActiveAssignmentsMap();
    return matchRequestCandidates(request, candidates, activeMap);
  },

  async assignRequest(id, assignedTo, changedBy = 'Admin', userRole = 'ADMIN') {
    // 1. Security check: Citizen users cannot assign requests
    if (userRole && userRole.toUpperCase() === 'CITIZEN') {
      return {
        error: 'Forbidden: Citizens are not authorized to assign disaster response requests.',
        status: 403,
        code: 'FORBIDDEN_CITIZEN'
      };
    }

    const request = await this.getRequestById(id);
    if (!request) {
      return { error: 'Request not found', status: 404, code: 'NOT_FOUND' };
    }

    // 2. Duplicate assignment prevention
    const isAlreadyAssigned = (
      request.assigned_to_user_id ||
      (request.assigned_to && request.assigned_to.id)
    ) && request.status !== 'PENDING';

    const currentAssigneeId = request.assigned_to_user_id || (request.assigned_to && request.assigned_to.id);
    const isSameAssignee = currentAssigneeId === assignedTo.id;

    if (isAlreadyAssigned && !isSameAssignee && !assignedTo.force && userRole !== 'ADMIN') {
      return {
        error: 'Conflict: Request is already actively assigned to another personnel.',
        status: 409,
        code: 'ALREADY_ASSIGNED',
        current_assigned_to: request.assigned_to || currentAssigneeId
      };
    }

    const previousStatus = request.status;
    const nowIso = new Date().toISOString();
    request.assigned_to = assignedTo;
    request.assigned_to_user_id = assignedTo.id;
    request.status = 'ASSIGNED';
    request.updated_at = nowIso;
    request.assigned_at = nowIso;

    const memReq = memoryStore.requests.find(r => r.id === id || r.client_local_id === id);
    if (memReq) {
      memReq.assigned_to = assignedTo;
      memReq.assigned_to_user_id = assignedTo.id;
      memReq.status = 'ASSIGNED';
      memReq.updated_at = nowIso;
      memReq.assigned_at = nowIso;
    }

    if (supabase) {
      const isUuid = assignedTo.id && assignedTo.id.length === 36 && assignedTo.id.includes('-');
      try {
        await supabase.from('emergency_requests').update({
          status: 'ASSIGNED',
          assigned_to_user_id: isUuid ? assignedTo.id : null,
          assigned_at: nowIso,
          updated_at: nowIso
        }).eq('id', id);

        await supabase.from('request_status_history').insert({
          request_id: request.id,
          previous_status: previousStatus,
          new_status: 'ASSIGNED',
          changed_by_user_id: isUuid ? assignedTo.id : null,
          notes: `Assigned to ${assignedTo.name || 'Personnel'} (${assignedTo.role || 'RESPONDER'}) by ${changedBy}`,
          changed_at: nowIso
        });
      } catch (dbErr) {
        console.warn('[Repository] Supabase assignment write warning:', dbErr.message);
      }
    }

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: request.id,
      previous_status: previousStatus,
      new_status: 'ASSIGNED',
      changed_by: changedBy || assignedTo.name || 'Admin',
      notes: `Assigned to ${assignedTo.name}`,
      timestamp: nowIso
    });

    return { request, success: true };
  },

  async recordAssignment({ request_id, assigned_to_user_id, assignment_role = 'PRIMARY', status = 'ASSIGNED', assigned_by_user_id = null }) {
    const record = {
      id: uuidv4(),
      request_id,
      assigned_to_user_id,
      assigned_by_user_id,
      assignment_role,
      status,
      assigned_at: new Date().toISOString(),
      accepted_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.requestAssignments.unshift(record);

    if (supabase) {
      const isReqUuid = request_id && request_id.length === 36 && request_id.includes('-');
      const isUserUuid = assigned_to_user_id && assigned_to_user_id.length === 36 && assigned_to_user_id.includes('-');
      if (isReqUuid && isUserUuid) {
        try {
          await supabase.from('request_assignments').insert(record);
        } catch (err) {
          console.warn('[Repository] Supabase insert request_assignments notice:', err.message);
        }
      }
    }
    return record;
  },

  async getRequestAssignments(requestId) {
    let list = [];
    if (supabase && typeof requestId === 'string' && requestId.length === 36 && requestId.includes('-')) {
      try {
        const { data, error } = await supabase
          .from('request_assignments')
          .select('*, users(id, full_name, phone, role)')
          .eq('request_id', requestId);
        if (!error && data && data.length > 0) {
          list = data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getRequestAssignments error:', err.message);
      }
    }
    if (list.length === 0) {
      list = memoryStore.requestAssignments.filter(a => a.request_id === requestId);
    }
    return list;
  },

  async assignSupportPersonnel(requestId, personnelId, role = 'VOLUNTEER', assignedBy = 'Admin') {
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('Request not found');

    const volunteers = await this.getVolunteers();
    const responders = await this.getResponders();
    const person = [...volunteers, ...responders].find(p => p.id === personnelId || p.user_id === personnelId);
    if (!person) throw new Error('Personnel not found');

    // Add support assignment record
    const assignment = await this.recordAssignment({
      request_id: requestId,
      assigned_to_user_id: person.id,
      assignment_role: 'SUPPORT',
      status: 'ASSIGNED',
      assigned_by_user_id: null
    });

    const nowIso = new Date().toISOString();
    if (supabase) {
      const isUuid = person.id && person.id.length === 36 && person.id.includes('-');
      try {
        await supabase.from('request_status_history').insert({
          request_id: requestId,
          previous_status: request.status,
          new_status: request.status,
          changed_by_user_id: isUuid ? person.id : null,
          notes: `Additional support ${person.name} (${role}) assigned by ${assignedBy}`,
          changed_at: nowIso
        });
      } catch (err) {
        console.warn('[Repository] Status history insert warning:', err.message);
      }
    }

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: requestId,
      previous_status: request.status,
      new_status: request.status,
      changed_by: assignedBy,
      notes: `Additional support ${person.name} (${role}) assigned by ${assignedBy}`,
      timestamp: nowIso
    });

    return assignment;
  },

  async reassignPrimaryPersonnel(requestId, personnelId, role = 'VOLUNTEER', assignedBy = 'Admin', reason = '') {
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('Request not found');

    const volunteers = await this.getVolunteers();
    const responders = await this.getResponders();
    const person = [...volunteers, ...responders].find(p => p.id === personnelId || p.user_id === personnelId);
    if (!person) throw new Error('Personnel not found');

    const previousAssignee = request.assigned_to?.name || 'Previous Assignee';
    const nowIso = new Date().toISOString();
    request.assigned_to_user_id = person.id;
    request.assigned_to = { id: person.id, name: person.name, role };
    request.status = 'ASSIGNED';
    request.assigned_at = nowIso;
    request.updated_at = nowIso;
    request.assignment_method = `REASSIGNED BY ADMIN`;
    request.assignment_explanation = `Reassigned from ${previousAssignee} to ${person.name}: ${reason || 'Workload reassignment'}`;

    if (supabase) {
      const isUuid = person.id && person.id.length === 36 && person.id.includes('-');
      try {
        await supabase.from('emergency_requests').update({
          assigned_to_user_id: isUuid ? person.id : null,
          status: 'ASSIGNED',
          assigned_at: nowIso,
          updated_at: nowIso
        }).eq('id', requestId);

        await supabase.from('request_assignments')
          .update({ status: 'CANCELLED', updated_at: nowIso })
          .eq('request_id', requestId)
          .eq('assignment_role', 'PRIMARY');

        await supabase.from('request_status_history').insert({
          request_id: requestId,
          previous_status: request.status,
          new_status: 'ASSIGNED',
          changed_by_user_id: isUuid ? person.id : null,
          notes: `Primary assignment reallocated from ${previousAssignee} to ${person.name} by ${assignedBy}. Reason: ${reason || 'Workload reallocation'}`,
          changed_at: nowIso
        });
      } catch (err) {
        console.warn('[Repository] Supabase reassign warning:', err.message);
      }
    }

    // Cancel in memoryStore
    memoryStore.requestAssignments
      .filter(a => a.request_id === requestId && a.assignment_role === 'PRIMARY')
      .forEach(a => {
        a.status = 'CANCELLED';
        a.updated_at = nowIso;
      });

    // Record new primary
    await this.recordAssignment({
      request_id: requestId,
      assigned_to_user_id: person.id,
      assignment_role: 'PRIMARY',
      status: 'ASSIGNED',
      assigned_by_user_id: null
    });

    memoryStore.statusHistory.unshift({
      id: uuidv4(),
      request_id: requestId,
      previous_status: request.status,
      new_status: 'ASSIGNED',
      changed_by: assignedBy,
      notes: `Primary assignment reallocated from ${previousAssignee} to ${person.name} by ${assignedBy}. Reason: ${reason || 'Workload reallocation'}`,
      timestamp: nowIso
    });

    return request;
  },

  async createTaskReport(reportData) {
    const report = {
      id: uuidv4(),
      request_id: reportData.request_id,
      reported_by_user_id: reportData.reported_by_user_id || null,
      reporter_name: reportData.reporter_name || 'Reporter',
      reporter_role: reportData.reporter_role || 'VOLUNTEER',
      issue_type: reportData.issue_type,
      description: reportData.description,
      latitude: reportData.latitude ? Number(reportData.latitude) : null,
      longitude: reportData.longitude ? Number(reportData.longitude) : null,
      status: 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by_user_id: null
    };

    memoryStore.taskReports.unshift(report);

    if (supabase) {
      const isReqUuid = report.request_id && report.request_id.length === 36 && report.request_id.includes('-');
      const isUserUuid = report.reported_by_user_id && report.reported_by_user_id.length === 36 && report.reported_by_user_id.includes('-');
      try {
        await supabase.from('task_reports').insert({
          ...report,
          request_id: isReqUuid ? report.request_id : null,
          reported_by_user_id: isUserUuid ? report.reported_by_user_id : null
        });
      } catch (err) {
        console.warn('[Repository] Supabase insert task_reports warning:', err.message);
      }
    }

    return report;
  },

  async getTaskReports({ requestId, status } = {}) {
    let list = null;
    if (supabase) {
      try {
        let query = supabase.from('task_reports').select('*');
        if (requestId) query = query.eq('request_id', requestId);
        if (status) query = query.eq('status', status.toUpperCase());
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          list = data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getTaskReports error:', err.message);
      }
    }
    if (list === null) {
      list = [...memoryStore.taskReports];
      if (requestId) list = list.filter(r => r.request_id === requestId);
      if (status) list = list.filter(r => r.status.toUpperCase() === status.toUpperCase());
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  },

  async updateTaskReportStatus(reportId, newStatus, resolvedBy = null) {
    const report = memoryStore.taskReports.find(r => r.id === reportId);
    const nowIso = new Date().toISOString();
    if (report) {
      report.status = newStatus;
      report.updated_at = nowIso;
      if (newStatus === 'RESOLVED') {
        report.resolved_at = nowIso;
        report.resolved_by_user_id = resolvedBy;
      }
    }

    if (supabase) {
      try {
        const updateData = { status: newStatus, updated_at: nowIso };
        if (newStatus === 'RESOLVED') {
          updateData.resolved_at = nowIso;
          updateData.resolved_by_user_id = resolvedBy;
        }
        await supabase.from('task_reports').update(updateData).eq('id', reportId);
      } catch (err) {
        console.warn('[Repository] Supabase update task_reports error:', err.message);
      }
    }

    return report;
  },

  async getNearbyFacilities(facilityType = 'hospitals', citizenLat, citizenLon, radiusKm = 10) {
    const cLat = Number(citizenLat);
    const cLon = Number(citizenLon);
    if (isNaN(cLat) || isNaN(cLon)) {
      return [];
    }

    let records = [];
    if (supabase) {
      try {
        const table = facilityType === 'hospitals' ? 'hospitals' : 'police_stations';
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data && data.length > 0) {
          records = data;
        }
      } catch (err) {
        console.warn(`[Repository] Supabase query ${facilityType} warning:`, err.message);
      }
    }

    if (records.length === 0) {
      const source = facilityType === 'hospitals' ? memoryStore.hospitals : memoryStore.policeStations;
      records = source || [];
    }

    const withDistance = records.map(item => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);
      const distance = calculateDistanceKm(cLat, cLon, lat, lon);
      return {
        ...item,
        distance_km: distance
      };
    })
    .filter(item => item.distance_km !== null && item.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);

    return withDistance;
  },

  async getStats() {
    let requests = memoryStore.requests;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('emergency_requests').select('*');
        if (!error && data) {
          requests = data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getStats query error, using memoryStore:', err.message);
      }
    }
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

  async getUserById(id) {
    if (supabase && typeof id === 'string' && id.length === 36 && id.includes('-')) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const idx = memoryStore.users.findIndex(u => u.id === id);
          if (idx !== -1) memoryStore.users[idx] = data;
          else memoryStore.users.push(data);
          return data;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getUserById warning:', err.message);
      }
    }
    return memoryStore.users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email) {
    if (!email) return null;
    let user = null;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').ilike('email', email.trim()).maybeSingle();
        if (!error && data) {
          const localUser = memoryStore.users.find(u => u.id === data.id || u.email?.toLowerCase() === email.trim().toLowerCase());
          const merged = { password: 'Password123!', ...localUser, ...data };
          const idx = memoryStore.users.findIndex(u => u.id === data.id);
          if (idx !== -1) memoryStore.users[idx] = merged;
          else memoryStore.users.push(merged);
          return merged;
        }
      } catch (err) {
        console.warn('[Repository] Supabase getUserByEmail warning:', err.message);
      }
    }
    const local = memoryStore.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (local && !local.password) {
      local.password = 'Password123!';
    }
    return local || null;
  },

  getAllUsers() {
    return memoryStore.users;
  },

  async updateUserProfile(id, updates = {}) {
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

    if (supabase) {
      try {
        const isUuid = typeof id === 'string' && id.length === 36 && id.includes('-');
        if (isUuid) {
          await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
            avatar_url: user.avatar_url
          });
        }
      } catch (err) {
        console.warn('[Repository] Supabase user upsert warning:', err.message);
      }
    }

    return user;
  },

  async authenticateUser(email, password) {
    if (!email || !password) {
      return { user: null, authUser: null, error: new Error('Email and password are required.') };
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (supabase) {
      const clientForAuth = supabaseAuth || supabase;
      const { data: authData, error: signInErr } = await clientForAuth.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (signInErr) {
        return { user: null, authUser: null, error: new Error('Invalid email or password.') };
      }

      const authUser = authData.user;
      let profile = await this.getUserById(authUser.id);
      if (!profile) {
        profile = await this.getUserByEmail(normalizedEmail);
      }

      if (!profile) {
        return { user: null, authUser, error: new Error('User profile not found in system.') };
      }

      return { user: profile, authUser, error: null };
    } else {
      const profile = await this.getUserByEmail(normalizedEmail);
      if (!profile) {
        return { user: null, authUser: null, error: new Error('Invalid email or password.') };
      }
      if (profile.password && profile.password !== password) {
        return { user: null, authUser: null, error: new Error('Invalid email or password.') };
      }
      return { user: profile, authUser: null, error: null };
    }
  },

  async registerCitizen({ full_name, email, phone, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required for registration.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    let authUserId = null;
    if (supabase) {
      let authResult;
      if (supabase.auth && supabase.auth.admin) {
        authResult = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name.trim(), role: 'CITIZEN' }
        });
      } else if (supabase.auth) {
        authResult = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password
        });
      }

      if (authResult?.error) {
        const msg = authResult.error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          throw new Error('An account with this email address already exists. Please log in.');
        }
        throw new Error(`Registration failed: ${authResult.error.message}`);
      }

      authUserId = authResult?.data?.user?.id;
    }

    if (!authUserId) {
      authUserId = uuidv4();
    }

    const user = {
      id: authUserId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      role: 'CITIZEN',
      avatar_url: null
    };

    if (supabase) {
      const { error: dbErr } = await supabase.from('users').insert(user);
      if (dbErr) {
        console.error('[Repository] Error inserting citizen user into DB:', dbErr.message);
        if (supabase.auth && supabase.auth.admin && authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (cleanErr) {
            console.error('[Repository] Cleanup of auth user failed:', cleanErr.message);
          }
        }
        throw new Error(`Failed to create user profile: ${dbErr.message}`);
      }
    }

    memoryStore.users.push(user);
    return user;
  },

  async registerVolunteer({ full_name, email, phone, password, capabilities = [], vehicle_type = 'Two Wheeler' }) {
    if (!email || !password) {
      throw new Error('Email and password are required for registration.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const validCaps = ['FOOD', 'WATER', 'MEDICINE', 'FIRST_AID', 'TRANSPORTATION', 'GENERAL_ASSISTANCE', 'RESCUE_SUPPORT'];
    const capsToInsert = capabilities
      .map(c => c.toUpperCase().replace('TRANSPORT', 'TRANSPORTATION').replace('GENERAL_RELIEF', 'GENERAL_ASSISTANCE'))
      .filter(c => validCaps.includes(c));

    let authUserId = null;
    if (supabase) {
      let authResult;
      if (supabase.auth && supabase.auth.admin) {
        authResult = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name.trim(), role: 'VOLUNTEER' }
        });
      } else if (supabase.auth) {
        authResult = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password
        });
      }

      if (authResult?.error) {
        const msg = authResult.error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          throw new Error('An account with this email address already exists. Please log in.');
        }
        throw new Error(`Registration failed: ${authResult.error.message}`);
      }

      authUserId = authResult?.data?.user?.id;
    }

    if (!authUserId) {
      authUserId = uuidv4();
    }

    const user = {
      id: authUserId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      role: 'VOLUNTEER',
      avatar_url: null
    };

    if (supabase) {
      const { error: userErr } = await supabase.from('users').insert(user);
      if (userErr) {
        console.error('[Repository] Error inserting volunteer user into DB:', userErr.message);
        if (supabase.auth && supabase.auth.admin && authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (cleanErr) {
            console.error('[Repository] Cleanup of auth user failed:', cleanErr.message);
          }
        }
        throw new Error(`Failed to create volunteer profile: ${userErr.message}`);
      }

      const { error: volErr } = await supabase.from('volunteers').insert({
        id: authUserId,
        vehicle_type: vehicle_type || 'Personal Vehicle',
        is_available: true,
        latitude: 16.5440,
        longitude: 81.5230
      });
      if (volErr) console.warn('[Repository] Error inserting volunteer record:', volErr.message);

      if (capsToInsert.length > 0) {
        const capRows = capsToInsert.map(c => ({
          volunteer_id: authUserId,
          capability: c
        }));
        const { error: capErr } = await supabase.from('volunteer_capabilities').insert(capRows);
        if (capErr) console.warn('[Repository] Error inserting volunteer capabilities:', capErr.message);
      }
    }

    memoryStore.users.push(user);
    memoryStore.volunteers.push({
      id: authUserId,
      user_id: authUserId,
      name: user.full_name,
      phone: user.phone || '',
      email: user.email,
      latitude: 16.5440,
      longitude: 81.5230,
      vehicle_type: vehicle_type || 'Personal Vehicle',
      is_available: true,
      capabilities: capsToInsert.length > 0 ? capsToInsert : ['GENERAL_ASSISTANCE']
    });

    return { ...user, capabilities: capsToInsert };
  },

  async registerResponder({ full_name, email, phone, password, responder_type = 'RESCUE_TEAM', badge_number = 'PENDING_APPROVAL' }) {
    if (!email || !password) {
      throw new Error('Email and password are required for registration.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const validTypes = ['RESCUE_TEAM', 'POLICE', 'MEDICAL_TEAM', 'FIRE_SERVICES'];
    const assignedType = validTypes.includes((responder_type || '').toUpperCase())
      ? responder_type.toUpperCase()
      : 'RESCUE_TEAM';

    let authUserId = null;
    if (supabase) {
      let authResult;
      if (supabase.auth && supabase.auth.admin) {
        authResult = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name.trim(), role: 'RESPONDER' }
        });
      } else if (supabase.auth) {
        authResult = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password
        });
      }

      if (authResult?.error) {
        const msg = authResult.error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          throw new Error('An account with this email address already exists. Please log in.');
        }
        throw new Error(`Registration failed: ${authResult.error.message}`);
      }

      authUserId = authResult?.data?.user?.id;
    }

    if (!authUserId) {
      authUserId = uuidv4();
    }

    const user = {
      id: authUserId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      role: 'RESPONDER',
      avatar_url: null
    };

    if (supabase) {
      const { error: userErr } = await supabase.from('users').insert(user);
      if (userErr) {
        console.error('[Repository] Error inserting responder user into DB:', userErr.message);
        if (supabase.auth && supabase.auth.admin && authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (cleanErr) {
            console.error('[Repository] Cleanup of auth user failed:', cleanErr.message);
          }
        }
        throw new Error(`Failed to create responder profile: ${userErr.message}`);
      }

      const { error: respErr } = await supabase.from('responders').insert({
        id: authUserId,
        badge_number: (badge_number || 'PENDING_VERIFICATION').trim(),
        responder_type: assignedType,
        is_available: false,
        latitude: 16.5449,
        longitude: 81.5212
      });
      if (respErr) console.warn('[Repository] Error inserting responder record:', respErr.message);
    }

    memoryStore.users.push(user);
    memoryStore.responders.push({
      id: authUserId,
      user_id: authUserId,
      name: user.full_name,
      phone: user.phone || '',
      email: user.email,
      badge_number: (badge_number || 'PENDING_VERIFICATION').trim(),
      responder_type: assignedType,
      latitude: 16.5449,
      longitude: 81.5212,
      is_available: false,
      active_assignments_count: 0
    });

    return { ...user, responder_type: assignedType, badge_number: badge_number || 'PENDING_VERIFICATION' };
  }
};

