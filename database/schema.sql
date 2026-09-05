-- ====================================================================
-- AI-POWERED DISASTER RESPONSE & RELIEF COORDINATION PLATFORM (VARAHI)
-- Supabase PostgreSQL + PostGIS Schema
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Enumerations
CREATE TYPE user_role_enum AS ENUM ('CITIZEN', 'RESPONDER', 'VOLUNTEER', 'ADMIN');
CREATE TYPE priority_level_enum AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE request_type_enum AS ENUM ('EMERGENCY', 'RESOURCE');
CREATE TYPE responder_type_enum AS ENUM ('POLICE', 'RESCUE_TEAM', 'MEDICAL_TEAM', 'FIRE_SERVICES', 'VOLUNTEER');
CREATE TYPE request_status_enum AS ENUM (
    'PENDING',
    'PRIORITIZED',
    'ASSIGNED',
    'ACCEPTED',
    'ON_THE_WAY',
    'RESCUE_IN_PROGRESS',
    'DELIVERY_IN_PROGRESS',
    'RESOLVED',
    'CANCELLED'
);
CREATE TYPE capability_enum AS ENUM (
    'FOOD',
    'WATER',
    'MEDICINE',
    'FIRST_AID',
    'TRANSPORTATION',
    'GENERAL_ASSISTANCE',
    'RESCUE_SUPPORT'
);

-- 3. Users Table (Aligned with Supabase Auth or Standalone)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'CITIZEN',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supabase Storage Bucket for Profile Photos (profile-images)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true) ON CONFLICT (id) DO NOTHING;


-- 4. Disaster Events (e.g., Heavy Flooding - Bhimavaram)
CREATE TABLE IF NOT EXISTS disaster_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    disaster_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL, -- Severe, Catastrophic, Moderate
    center_location GEOMETRY(Point, 4326),
    radius_km NUMERIC DEFAULT 15.0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Responders Profile
CREATE TABLE IF NOT EXISTS responders (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    badge_number VARCHAR(50),
    responder_type responder_type_enum NOT NULL DEFAULT 'RESCUE_TEAM',
    current_location GEOMETRY(Point, 4326),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_available BOOLEAN DEFAULT TRUE,
    active_assignments_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Volunteers Profile
CREATE TABLE IF NOT EXISTS volunteers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_location GEOMETRY(Point, 4326),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_available BOOLEAN DEFAULT TRUE,
    vehicle_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Volunteer Capabilities
CREATE TABLE IF NOT EXISTS volunteer_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    capability capability_enum NOT NULL,
    UNIQUE(volunteer_id, capability)
);

-- 8. Emergency and Resource Requests
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_local_id VARCHAR(100) UNIQUE, -- Used for offline-first deduplication
    citizen_id UUID REFERENCES users(id) ON DELETE SET NULL,
    citizen_name VARCHAR(255) NOT NULL,
    citizen_phone VARCHAR(50),
    request_type request_type_enum NOT NULL DEFAULT 'EMERGENCY',
    category VARCHAR(100) NOT NULL,
    
    -- Severity & Context Fields
    people_count INT DEFAULT 1,
    child_present BOOLEAN DEFAULT FALSE,
    elderly_present BOOLEAN DEFAULT FALSE,
    injured BOOLEAN DEFAULT FALSE,
    medical_emergency BOOLEAN DEFAULT FALSE,
    trapped BOOLEAN DEFAULT FALSE,
    life_threat BOOLEAN DEFAULT FALSE,
    requested_resource VARCHAR(150),
    description TEXT,
    image_url TEXT,
    damage_severity VARCHAR(50), -- Phase 2 AI Assessment
    
    -- Geospatial coordinates (PostGIS)
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    address TEXT,
    
    -- Priority Engine Outputs
    priority_score INT NOT NULL DEFAULT 50,
    priority_level priority_level_enum NOT NULL DEFAULT 'MEDIUM',
    priority_reason TEXT,
    recommended_responder responder_type_enum DEFAULT 'RESCUE_TEAM',
    
    -- State Management
    status request_status_enum NOT NULL DEFAULT 'PENDING',
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Offline capture metadata
    is_offline_captured BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Request Status Audit History
CREATE TABLE IF NOT EXISTS request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE,
    previous_status request_status_enum,
    new_status request_status_enum NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Critical Facilities & Infrastructure
CREATE TABLE IF NOT EXISTS shelters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    capacity INT DEFAULT 200,
    current_occupancy INT DEFAULT 0,
    contact_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    icu_beds_available INT DEFAULT 15,
    ambulance_available INT DEFAULT 3,
    contact_phone VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS police_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    control_room_number VARCHAR(50)
);

-- 11. SMS Notification Log
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES emergency_requests(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_role user_role_enum NOT NULL,
    message TEXT NOT NULL,
    provider_status VARCHAR(50) DEFAULT 'SENT',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Geospatial and Performance Indexes
CREATE INDEX IF NOT EXISTS idx_requests_location ON emergency_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON emergency_requests(priority_level, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_requests_created ON emergency_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responders_location ON responders USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_volunteers_location ON volunteers USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_police_location ON police_stations USING GIST (location);

-- 13. Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE request_status_history;
