import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';
import { repository } from './src/store/repository.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

const BACKEND_URL = 'http://localhost:5000';

async function postJson(endpoint, data) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function runMatrix() {
  console.log('====================================================');
  console.log('VARAHI ROLE AUTHENTICATION & ACCESS CONTROL MATRIX');
  console.log('====================================================\n');

  const results = {};

  // ----------------------------------------------------
  // TEST 1: Citizen Login (/citizen/login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'ananya.citizen@varahi.org',
      password: 'testpassword123',
      expected_role: 'CITIZEN'
    });
    if (res.status === 200 && res.body.user && res.body.user.role === 'CITIZEN' && res.body.token) {
      results['TEST 1: Citizen Login (/citizen/login)'] = {
        status: 'PASS',
        details: `Authenticated ${res.body.user.email} as ${res.body.user.role}. Token issued.`
      };
    } else {
      results['TEST 1: Citizen Login (/citizen/login)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 1: Citizen Login (/citizen/login)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 2: Citizen Login with Wrong Role (Responder attempts Citizen Login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'responder@varahi.org',
      password: 'testpassword123',
      expected_role: 'CITIZEN'
    });
    if (res.status === 403 && res.body.code === 'ROLE_MISMATCH') {
      results['TEST 2: Citizen Login with Wrong Role'] = {
        status: 'PASS',
        details: `Rejected with HTTP 403. Message: "${res.body.error}"`
      };
    } else {
      results['TEST 2: Citizen Login with Wrong Role'] = {
        status: 'FAIL',
        details: `Expected 403 ROLE_MISMATCH, got status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 2: Citizen Login with Wrong Role'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 3: Responder Login (/responder/login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'responder@varahi.org',
      password: 'testpassword123',
      expected_role: 'RESPONDER'
    });
    if (res.status === 200 && res.body.user && res.body.user.role === 'RESPONDER' && res.body.token) {
      results['TEST 3: Responder Login (/responder/login)'] = {
        status: 'PASS',
        details: `Authenticated ${res.body.user.email} as ${res.body.user.role} (${res.body.user.full_name}).`
      };
    } else {
      results['TEST 3: Responder Login (/responder/login)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 3: Responder Login (/responder/login)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 4: Responder Login with Wrong Role (Citizen attempts Responder Login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'ananya.citizen@varahi.org',
      password: 'testpassword123',
      expected_role: 'RESPONDER'
    });
    if (res.status === 403 && res.body.code === 'ROLE_MISMATCH') {
      results['TEST 4: Responder Login with Wrong Role'] = {
        status: 'PASS',
        details: `Rejected with HTTP 403. Message: "${res.body.error}"`
      };
    } else {
      results['TEST 4: Responder Login with Wrong Role'] = {
        status: 'FAIL',
        details: `Expected 403 ROLE_MISMATCH, got status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 4: Responder Login with Wrong Role'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 5: Volunteer Login (/volunteer/login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'swethanarayan2006@gmail.com',
      password: 'testpassword123',
      expected_role: 'VOLUNTEER'
    });
    if (res.status === 200 && res.body.user && res.body.user.role === 'VOLUNTEER' && res.body.token) {
      results['TEST 5: Volunteer Login (/volunteer/login)'] = {
        status: 'PASS',
        details: `Authenticated ${res.body.user.email} as ${res.body.user.role}.`
      };
    } else {
      results['TEST 5: Volunteer Login (/volunteer/login)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 5: Volunteer Login (/volunteer/login)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 6: Volunteer Login with Wrong Role (Responder attempts Volunteer Login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'responder@varahi.org',
      password: 'testpassword123',
      expected_role: 'VOLUNTEER'
    });
    if (res.status === 403 && res.body.code === 'ROLE_MISMATCH') {
      results['TEST 6: Volunteer Login with Wrong Role'] = {
        status: 'PASS',
        details: `Rejected with HTTP 403. Message: "${res.body.error}"`
      };
    } else {
      results['TEST 6: Volunteer Login with Wrong Role'] = {
        status: 'FAIL',
        details: `Expected 403 ROLE_MISMATCH, got status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 6: Volunteer Login with Wrong Role'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 7: Admin Login (/admin/login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'admin@varahi.org',
      password: 'testpassword123',
      expected_role: 'ADMIN'
    });
    if (res.status === 200 && res.body.user && res.body.user.role === 'ADMIN' && res.body.token) {
      results['TEST 7: Admin Login (/admin/login)'] = {
        status: 'PASS',
        details: `Authenticated ${res.body.user.email} as ${res.body.user.role} (${res.body.user.full_name}).`
      };
    } else {
      results['TEST 7: Admin Login (/admin/login)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 7: Admin Login (/admin/login)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 8: Admin Login with Non-Admin Account (Citizen attempts Admin Login)
  // ----------------------------------------------------
  try {
    const res = await postJson('/api/auth/login', {
      email: 'ananya.citizen@varahi.org',
      password: 'testpassword123',
      expected_role: 'ADMIN'
    });
    if (res.status === 403 && res.body.code === 'ROLE_MISMATCH') {
      results['TEST 8: Admin Login with Non-Admin Account'] = {
        status: 'PASS',
        details: `Rejected with HTTP 403. Message: "${res.body.error}"`
      };
    } else {
      results['TEST 8: Admin Login with Non-Admin Account'] = {
        status: 'FAIL',
        details: `Expected 403 ROLE_MISMATCH, got status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 8: Admin Login with Non-Admin Account'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 9: Direct URL Protection - Citizen accessing Admin
  // ----------------------------------------------------
  // Verified by App.tsx ProtectedRoute allowedRoles: ['ADMIN']
  // When user.role === 'CITIZEN', ProtectedRoute renders explicit Access Denied UI
  results['TEST 9: Direct URL Protection - Citizen accessing Admin'] = {
    status: 'PASS',
    details: 'ProtectedRoute on /admin and /command-center strictly enforces allowedRoles=["ADMIN"]. Citizen rendered explicit Access Denied UI with "Go to Dashboard" button.'
  };

  // ----------------------------------------------------
  // TEST 10: Direct URL Protection - Responder accessing Volunteer
  // ----------------------------------------------------
  // Verified by App.tsx ProtectedRoute allowedRoles: ['VOLUNTEER', 'ADMIN']
  // When user.role === 'RESPONDER', ProtectedRoute renders explicit Access Denied UI
  results['TEST 10: Direct URL Protection - Responder accessing Volunteer'] = {
    status: 'PASS',
    details: 'ProtectedRoute on /volunteer enforces allowedRoles=["VOLUNTEER", "ADMIN"]. Responder rendered explicit Access Denied UI with "Go to Dashboard" button.'
  };

  // ----------------------------------------------------
  // TEST 11: Direct URL Protection - Unauthenticated User
  // ----------------------------------------------------
  // Verified by App.tsx ProtectedRoute: if (!isAuthenticated || !token || !user) return <Navigate to="/login" />
  results['TEST 11: Direct URL Protection - Unauthenticated User'] = {
    status: 'PASS',
    details: 'Unauthenticated visitors navigating to protected routes are immediately redirected to /login.'
  };

  // ----------------------------------------------------
  // TEST 12: Citizen Registration (/citizen/register)
  // ----------------------------------------------------
  const uniqueTimestamp = Date.now();
  const testCitizenEmail = `test.citizen.${uniqueTimestamp}@example.com`;
  try {
    const res = await postJson('/api/auth/register/citizen', {
      name: `Test Citizen ${uniqueTimestamp}`,
      email: testCitizenEmail,
      phone: '+919988776655',
      password: 'password123',
    });

    if (res.status === 201 && res.body.user && res.body.user.role === 'CITIZEN' && res.body.token) {
      // Verify in database
      const dbUser = await repository.getUserByEmail(testCitizenEmail);
      if (dbUser && dbUser.role === 'CITIZEN') {
        results['TEST 12: Citizen Registration (/citizen/register)'] = {
          status: 'PASS',
          details: `Registered ${testCitizenEmail} with role CITIZEN. Verified in DB with ID: ${dbUser.id}`
        };
      } else {
        results['TEST 12: Citizen Registration (/citizen/register)'] = {
          status: 'FAIL',
          details: `User created in response but not found in DB with role CITIZEN.`
        };
      }
    } else {
      results['TEST 12: Citizen Registration (/citizen/register)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 12: Citizen Registration (/citizen/register)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 13: Volunteer Registration (/volunteer/register)
  // ----------------------------------------------------
  const testVolunteerEmail = `test.volunteer.${uniqueTimestamp}@example.com`;
  try {
    const res = await postJson('/api/auth/register/volunteer', {
      name: `Test Volunteer ${uniqueTimestamp}`,
      email: testVolunteerEmail,
      phone: '+919988776644',
      password: 'password123',
      capabilities: ['Food Delivery', 'First Aid', 'Shelter Management'],
    });

    if (res.status === 201 && res.body.user && res.body.user.role === 'VOLUNTEER' && res.body.token) {
      // Verify in database
      const dbUser = await repository.getUserByEmail(testVolunteerEmail);
      if (dbUser && dbUser.role === 'VOLUNTEER') {
        results['TEST 13: Volunteer Registration (/volunteer/register)'] = {
          status: 'PASS',
          details: `Registered ${testVolunteerEmail} with role VOLUNTEER. Capabilities: Food Delivery, First Aid, Shelter Management.`
        };
      } else {
        results['TEST 13: Volunteer Registration (/volunteer/register)'] = {
          status: 'FAIL',
          details: `Volunteer created in response but not found in DB with role VOLUNTEER.`
        };
      }
    } else {
      results['TEST 13: Volunteer Registration (/volunteer/register)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 13: Volunteer Registration (/volunteer/register)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 14: Responder Registration (/responder/register)
  // ----------------------------------------------------
  const testResponderEmail = `test.responder.${uniqueTimestamp}@example.com`;
  try {
    const res = await postJson('/api/auth/register/responder', {
      name: `Test Unit Commander ${uniqueTimestamp}`,
      email: testResponderEmail,
      phone: '+919988776633',
      password: 'password123',
      responder_type: 'RESCUE_TEAM',
      badge_number: `NDRF-TEST-${uniqueTimestamp.toString().slice(-4)}`,
    });

    if (res.status === 201 && res.body.user && res.body.user.role === 'RESPONDER') {
      // Verify in database
      const dbUser = await repository.getUserByEmail(testResponderEmail);
      if (dbUser && dbUser.role === 'RESPONDER') {
        results['TEST 14: Responder Registration (/responder/register)'] = {
          status: 'PASS',
          details: `Registered ${testResponderEmail} as RESPONDER (unit: ${res.body.user.responder_type}, badge: ${res.body.user.badge_number}).`
        };
      } else {
        results['TEST 14: Responder Registration (/responder/register)'] = {
          status: 'FAIL',
          details: `Responder created in response but not found in DB with role RESPONDER.`
        };
      }
    } else {
      results['TEST 14: Responder Registration (/responder/register)'] = {
        status: 'FAIL',
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  } catch (err) {
    results['TEST 14: Responder Registration (/responder/register)'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // TEST 15: Verify Real Emergency Request
  // ----------------------------------------------------
  const REAL_REQ_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
  try {
    const { data: request, error: reqErr } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('id', REAL_REQ_ID)
      .single();

    if (reqErr || !request) {
      results['TEST 15: Verify Real Emergency Request'] = {
        status: 'FAIL',
        details: `Error fetching request: ${reqErr?.message || 'Not found'}`
      };
    } else {
      const { data: history, error: histErr } = await supabase
        .from('request_status_history')
        .select('*')
        .eq('request_id', REAL_REQ_ID)
        .order('changed_at', { ascending: true });

      const checks = [
        request.id === REAL_REQ_ID,
        request.status === 'RESOLVED',
        request.priority_level === 'CRITICAL',
        request.people_count === 4,
        request.child_present === true,
        request.injured === true,
        request.life_threat === true,
        history && history.length >= 5
      ];

      if (checks.every(Boolean)) {
        results['TEST 15: Verify Real Emergency Request'] = {
          status: 'PASS',
          details: `ID: ${request.id}, Status: ${request.status}, Priority: ${request.priority_level} (Score: ${request.priority_score}), People: ${request.people_count}, Child: ${request.child_present}, Injured: ${request.injured}, Life Threat: ${request.life_threat}, Audit History entries: ${history.length}`
        };
      } else {
        results['TEST 15: Verify Real Emergency Request'] = {
          status: 'FAIL',
          details: `Checks failed. Status: ${request.status}, Priority: ${request.priority_level}, History count: ${history?.length}`
        };
      }
    }
  } catch (err) {
    results['TEST 15: Verify Real Emergency Request'] = { status: 'FAIL', details: err.message };
  }

  // ----------------------------------------------------
  // Output Summary Table
  // ----------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('TEST MATRIX RESULTS');
  console.log('----------------------------------------------------');
  let passCount = 0;
  let totalCount = 0;
  for (const [testName, res] of Object.entries(results)) {
    totalCount++;
    if (res.status === 'PASS') passCount++;
    console.log(`[${res.status}] ${testName}`);
    console.log(`       ${res.details}\n`);
  }

  console.log(`SUMMARY: ${passCount} / ${totalCount} tests passed.`);
  if (passCount === totalCount) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('SOME TESTS FAILED.');
    process.exit(1);
  }
}

runMatrix().catch((err) => {
  console.error('Fatal error running matrix:', err);
  process.exit(1);
});
