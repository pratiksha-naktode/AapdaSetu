-- ====================================================================
-- AI-POWERED DISASTER RESPONSE & RELIEF COORDINATION PLATFORM (VARAHI)
-- Bhimavaram Flood Disaster Seed Data
-- Center Coordinates: 16.5449° N, 81.5212° E (Bhimavaram, Andhra Pradesh)
-- ====================================================================

-- 1. Active Disaster Event
INSERT INTO disaster_events (id, name, disaster_type, severity, center_location, radius_km, status, description)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Heavy Flooding — Bhimavaram',
    'Flood / Flash Flood',
    'Severe',
    ST_SetSRID(ST_MakePoint(81.5212, 16.5449), 4326),
    20.0,
    'ACTIVE',
    'Yenamadurru Drain and Godavari canal breach causing widespread inundation across low-lying wards of Bhimavaram town.'
) ON CONFLICT (id) DO NOTHING;

-- 2. Users (Admin, Responders, Volunteers, Citizens)
INSERT INTO users (id, email, phone, full_name, role) VALUES
-- Admin
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@varahi.gov.in', '+919876543200', 'Bhimavaram District Control Room', 'ADMIN'),

-- Responders
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'ndrf.alpha@varahi.gov.in', '+919876543201', 'NDRF Rescue Unit Alpha (Capt. Rajesh)', 'RESPONDER'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'police.town@varahi.gov.in', '+919876543202', '1-Town Police Quick Response (Insp. Satya)', 'RESPONDER'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'medical.ems@varahi.gov.in', '+919876543203', 'Mobile Medical EMS Unit (Dr. Kavitha)', 'RESPONDER'),

-- Volunteers
('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'ramesh.med@volunteer.in', '+919876543211', 'Ramesh Varma (Medical Volunteer)', 'VOLUNTEER'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'suresh.food@volunteer.in', '+919876543212', 'Suresh Kumar (Food & Water Logistics)', 'VOLUNTEER'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'lakshmi.relief@volunteer.in', '+919876543213', 'Lakshmi Devi (General Assistance)', 'VOLUNTEER'),

-- Citizens
('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'venkata.citizen@gmail.com', '+919876543221', 'Venkata Ramana', 'CITIZEN'),
('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'annapurna.citizen@gmail.com', '+919876543222', 'Annapurna Devi', 'CITIZEN'),
('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'subbarao.citizen@gmail.com', '+919876543223', 'Subba Rao', 'CITIZEN')
ON CONFLICT (id) DO NOTHING;

-- 3. Responders Profile
INSERT INTO responders (id, badge_number, responder_type, current_location, latitude, longitude, is_available) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'NDRF-AP-04', 'RESCUE_TEAM', ST_SetSRID(ST_MakePoint(81.5240, 16.5410), 4326), 16.5410, 81.5240, TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'AP-POLICE-108', 'POLICE', ST_SetSRID(ST_MakePoint(81.5285, 16.5480), 4326), 16.5480, 81.5285, TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'EMS-AMB-02', 'MEDICAL_TEAM', ST_SetSRID(ST_MakePoint(81.5180, 16.5430), 4326), 16.5430, 81.5180, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Volunteers Profile & Capabilities
INSERT INTO volunteers (id, current_location, latitude, longitude, is_available, vehicle_type) VALUES
('cccccccc-cccc-cccc-cccc-ccccccccccc1', ST_SetSRID(ST_MakePoint(81.5220, 16.5470), 4326), 16.5470, 81.5220, TRUE, 'Two Wheeler'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', ST_SetSRID(ST_MakePoint(81.5300, 16.5390), 4326), 16.5390, 81.5300, TRUE, 'Utility Van'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', ST_SetSRID(ST_MakePoint(81.5150, 16.5495), 4326), 16.5495, 81.5150, TRUE, '4x4 Jeep')
ON CONFLICT (id) DO NOTHING;

INSERT INTO volunteer_capabilities (volunteer_id, capability) VALUES
('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'MEDICINE'),
('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'FIRST_AID'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'FOOD'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'WATER'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'TRANSPORTATION'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'GENERAL_ASSISTANCE'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'RESCUE_SUPPORT')
ON CONFLICT (volunteer_id, capability) DO NOTHING;

-- 5. Critical Facilities (Shelters, Hospitals, Police Stations)
INSERT INTO shelters (name, location, latitude, longitude, capacity, current_occupancy, contact_phone, status) VALUES
('DNR College Flood Relief Camp', ST_SetSRID(ST_MakePoint(81.5315, 16.5435), 4326), 16.5435, 81.5315, 500, 120, '+918816223344', 'OPEN'),
('Municipal High School Relief Shelter', ST_SetSRID(ST_MakePoint(81.5160, 16.5460), 4326), 16.5460, 81.5160, 300, 85, '+918816225566', 'OPEN');

INSERT INTO hospitals (name, location, latitude, longitude, icu_beds_available, ambulance_available, contact_phone) VALUES
('Bhimavaram Area District Hospital', ST_SetSRID(ST_MakePoint(81.5265, 16.5385), 4326), 16.5385, 81.5265, 14, 4, '+918816227788'),
('Surya Emergency Care Hospital', ST_SetSRID(ST_MakePoint(81.5190, 16.5510), 4326), 16.5510, 81.5190, 8, 2, '+918816229900');

INSERT INTO police_stations (name, location, latitude, longitude, control_room_number) VALUES
('1-Town Police Station Bhimavaram', ST_SetSRID(ST_MakePoint(81.5285, 16.5480), 4326), 16.5480, 81.5285, '+918816221100');

-- 6. Sample Initial Requests for Demo Scenario
INSERT INTO emergency_requests (
    id, client_local_id, citizen_id, citizen_name, citizen_phone, request_type, category,
    people_count, child_present, elderly_present, injured, medical_emergency, trapped, life_threat,
    requested_resource, description, location, latitude, longitude, address,
    priority_score, priority_level, priority_reason, recommended_responder, status
) VALUES
-- Request 1: 4 people trapped, child present, injured, immediate danger (CRITICAL 100)
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'LOC-DEMO-001',
    'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'Venkata Ramana', '+919876543221',
    'EMERGENCY', 'trapped_person',
    4, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE,
    NULL, 'Ground floor submerged by Yenamadurru drain water. 4 family members including an 8yo child trapped on roof slab. 1 elderly person injured ankle during evacuation.',
    ST_SetSRID(ST_MakePoint(81.5195, 16.5455), 4326), 16.5455, 81.5195, 'Door 4-12-8, Mavullamma Temple Backside, Bhimavaram',
    100, 'CRITICAL',
    'CRITICAL — People are trapped, there is an immediate life threat, injured individuals require urgent attention, children are present, and 4 people are affected.',
    'RESCUE_TEAM', 'PENDING'
),

-- Request 2: Elderly person needing medicine/insulin (HIGH 70)
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'LOC-DEMO-002',
    'dddddddd-dddd-dddd-dddd-ddddddddddd2', 'Annapurna Devi', '+919876543222',
    'RESOURCE', 'medicine',
    1, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE,
    'Insulin & Blood Pressure Medication', 'Roads flooded by 3 feet. Diabetic patient run out of insulin since yesterday evening.',
    ST_SetSRID(ST_MakePoint(81.5245, 16.5475), 4326), 16.5475, 81.5245, '2nd Lane, Balusumoodi, Bhimavaram',
    70, 'HIGH',
    'HIGH — Essential medicine required and elderly persons need rescue.',
    'VOLUNTEER', 'PENDING'
),

-- Request 3: Family needs drinking water on terrace (MEDIUM 55)
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'LOC-DEMO-003',
    'dddddddd-dddd-dddd-dddd-ddddddddddd3', 'Subba Rao', '+919876543223',
    'RESOURCE', 'water',
    5, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    'Drinking Water Cans', 'Water pipeline broken due to flood. 5 members safe on 1st floor but zero clean drinking water.',
    ST_SetSRID(ST_MakePoint(81.5270, 16.5415), 4326), 16.5415, 81.5270, 'Near Someswara Temple, Bhimavaram',
    55, 'MEDIUM',
    'MEDIUM — Drinking water urgently needed and 5 people are affected.',
    'VOLUNTEER', 'PENDING'
),

-- Request 4: Food packets required (MEDIUM 40)
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', 'LOC-DEMO-004',
    'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'Community Volunteers', '+919876543299',
    'RESOURCE', 'food',
    8, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    'Cooked Food Packets', '8 stranded migrants sheltered in school building waiting for meal packets.',
    ST_SetSRID(ST_MakePoint(81.5330, 16.5440), 4326), 16.5440, 81.5330, 'Gandhi Park Area, Bhimavaram',
    40, 'MEDIUM',
    'MEDIUM — Food supplies required and 8 people are affected.',
    'VOLUNTEER', 'PENDING'
)
ON CONFLICT (id) DO NOTHING;
