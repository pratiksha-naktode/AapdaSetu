export type UserRole = 'CITIZEN' | 'RESPONDER' | 'VOLUNTEER' | 'ADMIN';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RequestType = 'EMERGENCY' | 'RESOURCE';

export type RequestStatus =
  | 'PENDING'
  | 'PRIORITIZED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'RESCUE_IN_PROGRESS'
  | 'DELIVERY_IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED';

export type ResponderType = 'RESCUE_TEAM' | 'POLICE' | 'MEDICAL_TEAM' | 'FIRE_SERVICES' | 'VOLUNTEER';

export type VolunteerCapability =
  | 'FOOD'
  | 'WATER'
  | 'MEDICINE'
  | 'FIRST_AID'
  | 'TRANSPORTATION'
  | 'GENERAL_ASSISTANCE'
  | 'RESCUE_SUPPORT';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string | null;
}


export interface EmergencyRequest {
  id: string;
  client_local_id?: string | null;
  citizen_id?: string;
  citizen_name: string;
  citizen_phone: string;
  request_type: RequestType;
  category: string;
  people_count: number;
  child_present: boolean;
  elderly_present: boolean;
  injured: boolean;
  medical_emergency: boolean;
  trapped: boolean;
  life_threat: boolean;
  requested_resource?: string | null;
  description?: string;
  image_url?: string | null;
  damage_severity?: string | null;
  latitude: number;
  longitude: number;
  address?: string;
  priority_score: number;
  priority_level: PriorityLevel;
  priority_reason?: string;
  recommended_responder: ResponderType;
  status: RequestStatus;
  assigned_to?: {
    id: string;
    name: string;
    role?: string;
  } | null;
  is_offline_captured?: boolean;
  synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Responder {
  id: string;
  user_id: string;
  name: string;
  badge_number: string;
  responder_type: ResponderType;
  latitude: number;
  longitude: number;
  is_available: boolean;
  phone: string;
  distance_km?: number;
  active_assignments_count?: number;
}

export interface Volunteer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  vehicle_type?: string;
  is_available: boolean;
  capabilities: VolunteerCapability[];
  distance_km?: number;
  matches_capability?: boolean;
}

export interface Facility {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  current_occupancy?: number;
  icu_beds_available?: number;
  ambulance_available?: number;
  contact_phone?: string;
  status?: string;
}

export interface DashboardStats {
  total_requests: number;
  critical_requests: number;
  high_requests: number;
  medium_requests: number;
  low_requests: number;
  emergency_requests: number;
  resource_requests: number;
  resolved_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  active_responders: number;
  active_volunteers: number;
}

export interface DisasterEvent {
  id: string;
  name: string;
  disaster_type: string;
  severity: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: string;
  description: string;
}
