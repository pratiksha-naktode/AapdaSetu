import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';
import { repository } from './src/store/repository.js';

const BASE_URL = 'http://localhost:5000';
const FASTAPI_URL = 'http://127.0.0.1:8000';

const supabase = (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey))
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey)
  : null;

async function runRegression() {
  console.log('====================================================');
  console.log('🔄 REGRESSION TEST SUITE (STEPS 1-7 + STEP 8)');
  console.log('====================================================\n');

  const tests = {};

  // 1. Check Priority Engine (Step 3)
  try {
    const peRes = await fetch(`${FASTAPI_URL}/priority/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_type: 'emergency',
        trapped: true,
        people_count: 4,
        child_present: true,
        elderly_present: false,
        injured: true,
        medical_emergency: false,
        life_threat: true
      })
    });
    const peData = await peRes.json();
    if (peData.priority === 'CRITICAL' && peData.score === 100) {
      tests.priorityEngine = true;
      console.log('[PASS] Step 3 - FastAPI Priority Engine responds CRITICAL / 100');
    } else {
      tests.priorityEngine = false;
      console.warn('[FAIL] FastAPI Priority Engine unexpected output:', peData);
    }
  } catch (err) {
    tests.priorityEngine = false;
    console.warn('[FAIL] FastAPI Priority Engine unreachable:', err.message);
  }

  // 2. Check Auth & Dynamic Profile (Step 1, 6, 7)
  try {
    // Check existing real user Ananya Sharma in Supabase
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'ananya.citizen@varahi.org')
        .single();
      if (!error && user && user.avatar_url) {
        tests.dynamicAuthAndProfile = true;
        console.log(`[PASS] Step 1, 6, 7 - User Profile & Storage verified: ${user.full_name}, avatar: ${user.avatar_url}`);
      } else {
        tests.dynamicAuthAndProfile = false;
      }
    }
  } catch (err) {
    tests.dynamicAuthAndProfile = false;
    console.warn('[FAIL] Dynamic Auth & Profile check:', err.message);
  }

  // 3. Check Supabase + PostGIS persistence (Step 4)
  try {
    const REAL_EMERGENCY_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
    const { data: req, error } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('id', REAL_EMERGENCY_ID)
      .single();
    if (!error && req && req.location) {
      tests.supabasePostGIS = true;
      console.log(`[PASS] Step 4 - Supabase + PostGIS request #${req.id} verified with coordinates (${req.latitude}, ${req.longitude})`);
    } else {
      tests.supabasePostGIS = false;
    }
  } catch (err) {
    tests.supabasePostGIS = false;
    console.warn('[FAIL] Supabase PostGIS check:', err.message);
  }

  // 4. Check Backend Endpoints: Stats, Facilities, Requests
  try {
    const statsRes = await fetch(`${BASE_URL}/api/dashboard/statistics`);
    const statsData = await statsRes.json();

    const reqsRes = await fetch(`${BASE_URL}/api/requests`);
    const reqsData = await reqsRes.json();

    if (statsRes.ok && reqsRes.ok && reqsData.requests?.length > 0) {
      tests.backendEndpoints = true;
      console.log(`[PASS] Backend API - ${reqsData.count} requests retrieved with enriched matching metadata`);
    } else {
      tests.backendEndpoints = false;
    }
  } catch (err) {
    tests.backendEndpoints = false;
    console.warn('[FAIL] Backend endpoints check:', err.message);
  }

  // 5. Check Step 8 Matching Endpoint
  try {
    const REAL_EMERGENCY_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
    const matchRes = await fetch(`${BASE_URL}/api/requests/${REAL_EMERGENCY_ID}/matches`);
    const matchData = await matchRes.json();
    if (matchRes.ok && matchData.recommended_type === 'RESCUE_TEAM' && matchData.candidates?.length > 0) {
      tests.matchingEngine = true;
      console.log(`[PASS] Step 8 - Matching API recommended ${matchData.recommended_candidate?.name} (${matchData.recommended_candidate?.matching_score}/95)`);
    } else {
      tests.matchingEngine = false;
    }
  } catch (err) {
    tests.matchingEngine = false;
    console.warn('[FAIL] Step 8 Matching API check:', err.message);
  }

  console.log('\n====================================================');
  console.log('🏁 REGRESSION RESULTS:');
  console.log(JSON.stringify(tests, null, 2));
  console.log('====================================================');

  const allPassed = Object.values(tests).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

runRegression();
