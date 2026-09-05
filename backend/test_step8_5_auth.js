import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:5000';
const supabase = (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey))
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey)
  : null;

async function runStep8_5Tests() {
  console.log('====================================================');
  console.log('🧪 STEP 8.5: ROLE-BASED LOGIN & ACCESS TEST SUITE');
  console.log('====================================================\n');

  const results = {
    invalidCredentialsRejected: false,
    missingFieldsRejected: false,
    citizenLogin: false,
    responderLogin: false,
    volunteerLogin: false,
    adminLogin: false,
    sessionPersistence: false,
    roleBasedProtection: false,
    permanentDataPreserved: false
  };

  // ----------------------------------------------------------------
  // 1. Invalid Credentials Rejection
  // ----------------------------------------------------------------
  console.log('--- TEST 1: Invalid Credentials & Missing Fields ---');
  try {
    const missingRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });
    if (missingRes.status === 400) {
      results.missingFieldsRejected = true;
      console.log('[PASS] Missing fields correctly rejected with HTTP 400');
    }

    const invalidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent.user.9999@varahi.org', password: 'badpassword' })
    });
    if (invalidRes.status === 401) {
      results.invalidCredentialsRejected = true;
      console.log('[PASS] Non-existent user correctly rejected with HTTP 401');
    }
  } catch (err) {
    console.error('[FAIL] Test 1:', err.message);
  }

  // ----------------------------------------------------------------
  // 2. Role-Based Login for all 4 roles
  // ----------------------------------------------------------------
  const rolesToTest = [
    { role: 'CITIZEN', email: 'ananya.citizen@varahi.org', expectedPortal: '/citizen' },
    { role: 'RESPONDER', email: 'responder@varahi.org', expectedPortal: '/responder' },
    { role: 'VOLUNTEER', email: 'swethanarayan2006@gmail.com', expectedPortal: '/volunteer' },
    { role: 'ADMIN', email: 'admin@varahi.org', expectedPortal: '/command-center' }
  ];

  const tokens = {};

  for (const item of rolesToTest) {
    console.log(`\n--- TEST LOGIN: Role ${item.role} (${item.email}) ---`);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: item.email, password: 'secure-varahi-pass' })
      });

      if (!res.ok) {
        throw new Error(`Login failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      tokens[item.role] = data.token;

      console.log(`[PASS] Login succeeded for ${item.email}`);
      console.log(`  Name: ${data.user.full_name}`);
      console.log(`  Authoritative Role: ${data.user.role}`);
      console.log(`  Token: ${data.token}`);

      if (data.user.role === item.role) {
        if (item.role === 'CITIZEN') results.citizenLogin = true;
        if (item.role === 'RESPONDER') results.responderLogin = true;
        if (item.role === 'VOLUNTEER') results.volunteerLogin = true;
        if (item.role === 'ADMIN') results.adminLogin = true;
        console.log(`[PASS] Role matches expected: ${item.role} -> ${item.expectedPortal}`);
      } else {
        console.warn(`[FAIL] Expected role ${item.role}, got ${data.user.role}`);
      }
    } catch (err) {
      console.error(`[FAIL] Login for ${item.role}:`, err.message);
    }
  }

  // ----------------------------------------------------------------
  // 3. Session Persistence via /api/auth/me
  // ----------------------------------------------------------------
  console.log('\n--- TEST 3: Session Verification via /api/auth/me ---');
  try {
    const adminToken = tokens['ADMIN'];
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (meRes.ok) {
      const meData = await meRes.json();
      console.log(`[PASS] Session verified via Bearer token: ${meData.user.full_name} (${meData.user.role})`);
      if (meData.user.role === 'ADMIN') {
        results.sessionPersistence = true;
      }
    } else {
      console.warn(`[FAIL] /api/auth/me returned HTTP ${meRes.status}`);
    }
  } catch (err) {
    console.error('[FAIL] Test 3:', err.message);
  }

  // ----------------------------------------------------------------
  // 4. Role-based Authorization Enforcement
  // ----------------------------------------------------------------
  console.log('\n--- TEST 4: Role-Based Authorization Enforcement ---');
  try {
    const REAL_EMERGENCY_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
    
    // Citizen attempts assignment -> must be blocked with HTTP 403
    const citizenAssignRes = await fetch(`${BASE_URL}/api/requests/${REAL_EMERGENCY_ID}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens['CITIZEN']}`,
        'x-user-role': 'CITIZEN'
      },
      body: JSON.stringify({
        assigned_to: { id: 'some-id', name: 'Some Responder' }
      })
    });

    console.log(`  Citizen assignment HTTP code: ${citizenAssignRes.status}`);
    if (citizenAssignRes.status === 403) {
      results.roleBasedProtection = true;
      console.log('[PASS] Authorization check correctly rejected citizen assignment with HTTP 403');
    } else {
      console.warn(`[WARN] Expected 403, got ${citizenAssignRes.status}`);
    }
  } catch (err) {
    console.error('[FAIL] Test 4:', err.message);
  }

  // ----------------------------------------------------------------
  // 5. Permanent Data Check
  // ----------------------------------------------------------------
  console.log('\n--- TEST 5: Verify Permanent Real Emergency Request ---');
  try {
    const REAL_EMERGENCY_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
    if (supabase) {
      const { data: req, error } = await supabase.from('emergency_requests').select('*').eq('id', REAL_EMERGENCY_ID).single();
      const { data: history } = await supabase.from('request_status_history').select('*').eq('request_id', REAL_EMERGENCY_ID);
      if (!error && req) {
        console.log(`[PASS] Emergency request #${req.id} is intact: Priority=${req.priority_score}, Status=${req.status}`);
        console.log(`  Audit history count: ${history?.length || 0}`);
        results.permanentDataPreserved = true;
      }
    }
  } catch (err) {
    console.error('[FAIL] Test 5:', err.message);
  }

  console.log('\n====================================================');
  console.log('🏁 STEP 8.5 TEST RESULTS SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');

  const allPassed = Object.values(results).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

runStep8_5Tests();
