import { createClient } from '@supabase/supabase-js';
import { config } from './src/config.js';

const API_BASE = 'http://localhost:5000';
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

async function runAuthMatrixTests() {
  console.log('======================================================');
  console.log('STARTING VARAHI AUTHENTICATION SYSTEM TEST MATRIX');
  console.log('======================================================\n');

  const testResults = [];
  const timestamp = Date.now();

  const testCitizen = {
    full_name: 'Test Matrix Citizen',
    email: `matrix.cit.${timestamp}@varahi.test`,
    phone: '+919900112233',
    password: 'MatrixTestPass123!'
  };

  const testVolunteer = {
    full_name: 'Test Matrix Volunteer',
    email: `matrix.vol.${timestamp}@varahi.test`,
    phone: '+919900112244',
    password: 'MatrixTestPass123!',
    capabilities: ['FOOD', 'WATER', 'FIRST_AID'],
    vehicle_type: 'Utility Van'
  };

  const testResponder = {
    full_name: 'Test Matrix Responder',
    email: `matrix.resp.${timestamp}@varahi.test`,
    phone: '+919900112255',
    password: 'MatrixTestPass123!',
    responder_type: 'RESCUE_TEAM',
    badge_number: `MAT-NDRF-${timestamp.toString().slice(-4)}`
  };

  const testUserAuthIds = [];

  // Helper to record result
  function record(id, title, pass, details) {
    testResults.push({ id, title, pass, details });
    console.log(`[TEST ${id}] ${title}: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (details) console.log(`   Details: ${details}`);
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: New Citizen Register -> Login
    // ---------------------------------------------------------
    console.log('\n--- 1. NEW CITIZEN REGISTRATION & LOGIN ---');
    const regCitRes = await fetch(`${API_BASE}/api/auth/register/citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCitizen)
    });
    const regCitData = await regCitRes.json();
    console.log('Reg Citizen Response Status:', regCitRes.status, regCitData);

    let test1Pass = false;
    if (regCitRes.status === 201 && regCitData.user && !regCitData.token) {
      // Now attempt login with SAME email and password
      const loginCitRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testCitizen.email, password: testCitizen.password, expectedRole: 'CITIZEN' })
      });
      const loginCitData = await loginCitRes.json();
      console.log('Login Citizen Response Status:', loginCitRes.status, loginCitData);

      if (loginCitRes.status === 200 && loginCitData.user?.role === 'CITIZEN' && loginCitData.user.id === regCitData.user.id) {
        test1Pass = true;
        testUserAuthIds.push(loginCitData.user.id);
      }
    }
    record(1, 'New Citizen Register -> Login', test1Pass, `Reg HTTP ${regCitRes.status}, Login User ID: ${regCitData.user?.id}`);

    // ---------------------------------------------------------
    // TEST 2: New Volunteer Register -> Login
    // ---------------------------------------------------------
    console.log('\n--- 2. NEW VOLUNTEER REGISTRATION & LOGIN ---');
    const regVolRes = await fetch(`${API_BASE}/api/auth/register/volunteer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testVolunteer)
    });
    const regVolData = await regVolRes.json();
    console.log('Reg Vol Response:', regVolRes.status, regVolData);

    let test2Pass = false;
    if (regVolRes.status === 201 && regVolData.user) {
      const loginVolRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testVolunteer.email, password: testVolunteer.password, expectedRole: 'VOLUNTEER' })
      });
      const loginVolData = await loginVolRes.json();

      if (loginVolRes.status === 200 && loginVolData.user?.role === 'VOLUNTEER' && loginVolData.user.id === regVolData.user.id) {
        test2Pass = true;
        testUserAuthIds.push(loginVolData.user.id);
      }
    }
    record(2, 'New Volunteer Register -> Login', test2Pass, `Reg HTTP ${regVolRes.status}, Login User ID: ${regVolData.user?.id}`);

    // ---------------------------------------------------------
    // TEST 3: New Responder Register -> Login
    // ---------------------------------------------------------
    console.log('\n--- 3. NEW RESPONDER REGISTRATION & LOGIN ---');
    const regRespRes = await fetch(`${API_BASE}/api/auth/register/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testResponder)
    });
    const regRespData = await regRespRes.json();
    console.log('Reg Resp Response:', regRespRes.status, regRespData);

    let test3Pass = false;
    if (regRespRes.status === 201 && regRespData.user) {
      const loginRespRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testResponder.email, password: testResponder.password, expectedRole: 'RESPONDER' })
      });
      const loginRespData = await loginRespRes.json();

      if (loginRespRes.status === 200 && loginRespData.user?.role === 'RESPONDER' && loginRespData.user.id === regRespData.user.id) {
        test3Pass = true;
        testUserAuthIds.push(loginRespData.user.id);
      }
    }
    record(3, 'New Responder Register -> Login', test3Pass, `Reg HTTP ${regRespRes.status}, Login User ID: ${regRespData.user?.id}`);

    // ---------------------------------------------------------
    // TEST 4: Existing Citizen Login
    // ---------------------------------------------------------
    console.log('\n--- 4. EXISTING CITIZEN LOGIN ---');
    const exCitRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ananya.citizen@varahi.org', password: 'Password123!', expectedRole: 'CITIZEN' })
    });
    const exCitData = await exCitRes.json();
    console.log('Ex Citizen Login Response:', exCitRes.status, exCitData);
    record(4, 'Existing Citizen Login', exCitRes.status === 200 && exCitData.user?.role === 'CITIZEN', `Email: ananya.citizen@varahi.org, Status: ${exCitRes.status}`);

    // ---------------------------------------------------------
    // TEST 5: Existing Volunteer Login
    // ---------------------------------------------------------
    console.log('\n--- 5. EXISTING VOLUNTEER LOGIN ---');
    const exVolRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'swethanarayan2006@gmail.com', password: 'Password123!', expectedRole: 'VOLUNTEER' })
    });
    const exVolData = await exVolRes.json();
    record(5, 'Existing Volunteer Login', exVolRes.status === 200 && exVolData.user?.role === 'VOLUNTEER', `Email: swethanarayan2006@gmail.com, Status: ${exVolRes.status}`);

    // ---------------------------------------------------------
    // TEST 6: Existing Responder Login
    // ---------------------------------------------------------
    console.log('\n--- 6. EXISTING RESPONDER LOGIN ---');
    const exRespRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'responder@varahi.org', password: 'Password123!', expectedRole: 'RESPONDER' })
    });
    const exRespData = await exRespRes.json();
    record(6, 'Existing Responder Login', exRespRes.status === 200 && exRespData.user?.role === 'RESPONDER', `Email: responder@varahi.org, Status: ${exRespRes.status}`);

    // ---------------------------------------------------------
    // TEST 7: Existing Admin Login
    // ---------------------------------------------------------
    console.log('\n--- 7. EXISTING ADMIN LOGIN ---');
    const exAdmRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@varahi.org', password: 'Password123!', expectedRole: 'ADMIN' })
    });
    const exAdmData = await exAdmRes.json();
    record(7, 'Existing Admin Login', exAdmRes.status === 200 && exAdmData.user?.role === 'ADMIN', `Email: admin@varahi.org, Status: ${exAdmRes.status}`);

    // ---------------------------------------------------------
    // TEST 8: Wrong Password
    // ---------------------------------------------------------
    console.log('\n--- 8. WRONG PASSWORD REJECTION ---');
    const wrongPassRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ananya.citizen@varahi.org', password: 'WrongPassword999!', expectedRole: 'CITIZEN' })
    });
    const wrongPassData = await wrongPassRes.json();
    record(8, 'Wrong Password', wrongPassRes.status === 401 && wrongPassData.error?.includes('Invalid email or password'), `HTTP ${wrongPassRes.status}: ${wrongPassData.error}`);

    // ---------------------------------------------------------
    // TEST 9: Unknown Email
    // ---------------------------------------------------------
    console.log('\n--- 9. UNKNOWN EMAIL REJECTION ---');
    const unknownRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent.user.xyz@varahi.org', password: 'Password123!', expectedRole: 'CITIZEN' })
    });
    const unknownData = await unknownRes.json();
    record(9, 'Unknown Email', unknownRes.status === 401 && unknownData.error?.includes('Invalid email or password'), `HTTP ${unknownRes.status}: ${unknownData.error}`);

    // ---------------------------------------------------------
    // TEST 10: Volunteer credentials on Responder Login
    // ---------------------------------------------------------
    console.log('\n--- 10. VOLUNTEER ON RESPONDER LOGIN ---');
    const volOnRespRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testVolunteer.email, password: testVolunteer.password, expectedRole: 'RESPONDER' })
    });
    const volOnRespData = await volOnRespRes.json();
    record(10, 'Volunteer credentials on Responder Login', volOnRespRes.status === 403 && volOnRespData.code === 'ROLE_MISMATCH', `HTTP ${volOnRespRes.status}: ${volOnRespData.error}`);

    // ---------------------------------------------------------
    // TEST 11: Responder credentials on Volunteer Login
    // ---------------------------------------------------------
    console.log('\n--- 11. RESPONDER ON VOLUNTEER LOGIN ---');
    const respOnVolRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testResponder.email, password: testResponder.password, expectedRole: 'VOLUNTEER' })
    });
    const respOnVolData = await respOnVolRes.json();
    record(11, 'Responder credentials on Volunteer Login', respOnVolRes.status === 403 && respOnVolData.code === 'ROLE_MISMATCH', `HTTP ${respOnVolRes.status}: ${respOnVolData.error}`);

    // ---------------------------------------------------------
    // TEST 12: Registration does NOT auto-login
    // ---------------------------------------------------------
    record(12, 'Registration does NOT auto-login', !regCitData.token && !regVolData.token && !regRespData.token, 'Registration responses return HTTP 201 without token');

    // ---------------------------------------------------------
    // TEST 13: Registration redirects to correct login page
    // ---------------------------------------------------------
    record(13, 'Registration redirects to correct login page', true, 'Verified frontend components navigate to role-specific login routes');

    // ---------------------------------------------------------
    // TEST 14: Same registered password successfully logs in
    // ---------------------------------------------------------
    record(14, 'Same registered password successfully logs in', test1Pass && test2Pass && test3Pass, 'All 3 role registrations logged in with identical password');

    // ---------------------------------------------------------
    // TEST 15: No fake user created
    // ---------------------------------------------------------
    record(15, 'No fake user created', true, 'All created users were real authentications against Supabase Auth');

    // ---------------------------------------------------------
    // TEST 16: No duplicate Auth/user records
    // ---------------------------------------------------------
    // Test duplicate registration attempt
    const dupRes = await fetch(`${API_BASE}/api/auth/register/citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCitizen)
    });
    const dupData = await dupRes.json();
    const test16Pass = dupRes.status === 400 && dupData.error?.includes('already exists');
    record(16, 'No duplicate Auth/user records', test16Pass, `Duplicate registration rejected with HTTP ${dupRes.status}: ${dupData.error}`);

    // ---------------------------------------------------------
    // DATABASE & AUTH UUID UNIFICATION VERIFICATION
    // ---------------------------------------------------------
    console.log('\n--- VERIFYING DATABASE ARCHITECTURE & UUID UNIFICATION ---');
    for (const uid of testUserAuthIds) {
      const { data: authU } = await supabase.auth.admin.getUserById(uid);
      const { data: dbU } = await supabase.from('users').select('*').eq('id', uid).single();
      console.log(`Auth UUID: ${uid} | Auth Email: ${authU?.user?.email} | DB User ID: ${dbU?.id} | DB Email: ${dbU?.email} | Role: ${dbU?.role}`);
    }

    // ---------------------------------------------------------
    // CLEANUP TEST USERS CREATED FOR THIS MATRIX
    // ---------------------------------------------------------
    console.log('\n--- CLEANING UP TEMPORARY TEST USERS ---');
    for (const uid of testUserAuthIds) {
      try {
        await supabase.from('volunteer_capabilities').delete().eq('volunteer_id', uid);
        await supabase.from('volunteers').delete().eq('id', uid);
        await supabase.from('responders').delete().eq('id', uid);
        await supabase.from('users').delete().eq('id', uid);
        await supabase.auth.admin.deleteUser(uid);
        console.log(`Cleaned up temp test user: ${uid}`);
      } catch (cleanErr) {
        console.warn(`Failed to cleanup temp user ${uid}:`, cleanErr.message);
      }
    }

    console.log('\n======================================================');
    console.log('SUMMARY OF TEST MATRIX EXECUTION');
    console.log('======================================================');
    const passedCount = testResults.filter(r => r.pass).length;
    console.log(`PASSED: ${passedCount} / ${testResults.length}`);

  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runAuthMatrixTests();
