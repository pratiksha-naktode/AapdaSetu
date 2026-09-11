const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('===============================================================');
  console.log('STARTING AUTOMATIC RESPONDER ASSIGNMENT & FLOWS VALIDATION');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const results = [];
  function record(id, title, pass, details = '') {
    results.push({ id, title, pass, details });
    console.log(`[TEST ${id}] ${title}: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (details) console.log(`   -> ${details}`);
  }

  // 1. Citizen Registration & Login
  const cit = {
    full_name: 'Auto Assign Citizen',
    email: `cit.auto.${timestamp}@varahi.test`,
    phone: `+919711${timestamp.toString().slice(-6)}`,
    password: 'Password123!'
  };
  await fetch(`${API_BASE}/api/auth/register/citizen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cit)
  });
  const citLogin = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cit.email, password: cit.password, expectedRole: 'CITIZEN' })
  })).json();
  const tokenCit = citLogin.token;
  const userCit = citLogin.user;

  // 2. Admin Login
  const adminLogin = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@varahi.org', password: 'Password123!', expectedRole: 'ADMIN' })
  })).json();
  const tokenAdmin = adminLogin.token;

  // 3. Create 4 Distinct Responders with different locations, availability, workloads & types
  // Responder 1: Nearest (0.5km), RESCUE_TEAM, Available, 0 tasks -> Should be chosen for trapped flood rescue!
  // Responder 2: Further away (3.5km), RESCUE_TEAM, Available, 0 tasks
  // Responder 3: Very close (0.3km), but OVERLOADED with 4 tasks -> Must NOT be chosen!
  // Responder 4: Unavailable (is_available = false) -> Must NOT be chosen!
  // Responder 5: Missing location -> Must NOT be chosen!
  // Responder 6: MEDICAL_TEAM (1.0km) -> Should be chosen for Medical Emergency!

  console.log('1. Setting up Test Responders in Sector...');
  const resp1 = {
    full_name: 'NDRF Unit 1 (Nearest)',
    email: `ndrf1.${timestamp}@varahi.test`,
    phone: `+919701${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'RESCUE_TEAM'
  };
  const resp2 = {
    full_name: 'NDRF Unit 2 (Farther)',
    email: `ndrf2.${timestamp}@varahi.test`,
    phone: `+919702${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'RESCUE_TEAM'
  };
  const resp3 = {
    full_name: 'NDRF Unit 3 (Busy 4 tasks)',
    email: `ndrf3.${timestamp}@varahi.test`,
    phone: `+919703${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'RESCUE_TEAM'
  };
  const resp4 = {
    full_name: 'NDRF Unit 4 (Unavailable)',
    email: `ndrf4.${timestamp}@varahi.test`,
    phone: `+919704${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'RESCUE_TEAM'
  };
  const resp6 = {
    full_name: 'EMS Medical Unit 6 (Doctor)',
    email: `ems6.${timestamp}@varahi.test`,
    phone: `+919706${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'MEDICAL_TEAM'
  };

  for (const r of [resp1, resp2, resp3, resp4, resp6]) {
    await fetch(`${API_BASE}/api/auth/register/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    });
  }

  const loginR1 = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resp1.email, password: resp1.password, expectedRole: 'RESPONDER' })
  })).json();

  const loginR2 = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resp2.email, password: resp2.password, expectedRole: 'RESPONDER' })
  })).json();

  const loginR3 = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resp3.email, password: resp3.password, expectedRole: 'RESPONDER' })
  })).json();

  const loginR4 = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resp4.email, password: resp4.password, expectedRole: 'RESPONDER' })
  })).json();

  const loginR6 = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resp6.email, password: resp6.password, expectedRole: 'RESPONDER' })
  })).json();

  // Set real GPS locations in a unique test sector:
  const baseLat = 17.2000 + (timestamp % 500) / 10000;
  const baseLon = 82.3000 + (timestamp % 500) / 10000;

  // Resp 1: baseLat + 0.0010, baseLon + 0.0010 (~0.15 km)
  // Resp 2: baseLat + 0.0300, baseLon + 0.0300 (~4.1 km)
  // Resp 3: baseLat + 0.0002, baseLon + 0.0002 (~0.03 km, overloaded with 4 tasks)
  // Resp 4: baseLat + 0.0003, baseLon + 0.0003 (~0.04 km, unavailable)
  // Resp 6: baseLat + 0.0030, baseLon + 0.0030 (~0.45 km, MEDICAL_TEAM)

  await fetch(`${API_BASE}/api/responders/${loginR1.user.id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: baseLat + 0.0010, longitude: baseLon + 0.0010, is_available: true })
  });

  await fetch(`${API_BASE}/api/responders/${loginR2.user.id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: baseLat + 0.0300, longitude: baseLon + 0.0300, is_available: true })
  });

  await fetch(`${API_BASE}/api/responders/${loginR3.user.id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: baseLat + 0.0002, longitude: baseLon + 0.0002, is_available: true })
  });

  await fetch(`${API_BASE}/api/responders/${loginR4.user.id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: baseLat + 0.0003, longitude: baseLon + 0.0003, is_available: false })
  });

  await fetch(`${API_BASE}/api/responders/${loginR6.user.id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: baseLat + 0.0030, longitude: baseLon + 0.0030, is_available: true })
  });

  // Give Responder 3 exactly 4 active tasks to test 4-task workload exclusion
  console.log('Assigning 4 tasks to Responder 3 to test workload limit...');
  for (let i = 1; i <= 4; i++) {
    const dummy = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenCit}`, 'x-user-id': userCit.id },
      body: JSON.stringify({ category: 'flood', description: `Task ${i} for R3`, latitude: baseLat, longitude: baseLon })
    })).json()).request;

    await fetch(`${API_BASE}/api/requests/${dummy.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ assigned_to: { id: loginR3.user.id, name: resp3.full_name, role: 'RESPONDER' } })
    });
  }

  // -------------------------------------------------------------
  // TEST 1: Submit Emergency 1 -> Automatic Assignment to Nearest Available (Resp 1)
  // -------------------------------------------------------------
  console.log('\n--- TEST SCENARIO: AUTOMATIC ASSIGNMENT OF NEW EMERGENCY ---');
  const em1Res = await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenCit}`,
      'x-user-id': userCit.id
    },
    body: JSON.stringify({
      category: 'trapped_person',
      description: 'Family trapped in house roof due to Godavari canal flood inundation',
      people_count: 3,
      trapped: true,
      latitude: baseLat,
      longitude: baseLon,
      address: 'Ward 5, Bhimavaram'
    })
  });
  const em1Data = await em1Res.json();
  const em1 = em1Data.request;

  record(1, 'Emergency created with valid GPS coordinates', em1.latitude === baseLat && em1.longitude === baseLon);
  record(2, 'Emergency status automatically ASSIGNED without admin action', em1.status === 'ASSIGNED', `Status: ${em1.status}`);
  record(3, 'Nearest eligible responder (Resp 1) auto-selected', em1.assigned_to_user_id === loginR1.user.id, `Assigned ID: ${em1.assigned_to_user_id} (Expected: ${loginR1.user.id})`);
  record(4, 'Closer overloaded responder (Resp 3 with 4 tasks) was EXCLUDED', em1.assigned_to_user_id !== loginR3.user.id, `Excluded busy unit 3`);
  record(5, 'Unavailable responder (Resp 4) was NOT selected', em1.assigned_to_user_id !== loginR4.user.id);
  record(6, 'Distance is calculated accurately via Haversine', em1.responder_distance_km !== null && em1.responder_distance_km < 1.0, `Calculated Distance: ${em1.responder_distance_km} km`);
  record(7, 'Assignment method tag set to AUTO', em1.assignment_method?.includes('AUTO'), `Method: ${em1.assignment_method}`);

  // -------------------------------------------------------------
  // TEST 8: Capability Matching (Medical Emergency -> MEDICAL_TEAM)
  // -------------------------------------------------------------
  console.log('\n--- TEST SCENARIO: CAPABILITY MATCHING (MEDICAL) ---');
  const emMed = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenCit}`, 'x-user-id': userCit.id },
    body: JSON.stringify({
      category: 'medical_trauma',
      description: 'Senior citizen suffered severe cardiac trauma in relief camp',
      people_count: 1,
      injured: true,
      medical_emergency: true,
      latitude: baseLat,
      longitude: baseLon
    })
  })).json()).request;

  record(8, 'Medical Emergency auto-assigned to MEDICAL_TEAM (Resp 6)', emMed.assigned_to_user_id === loginR6.user.id, `Assigned: ${emMed.assigned_to?.name} (${emMed.assigned_responder_type})`);

  // -------------------------------------------------------------
  // TEST 9 & 10: Role-Based Visibility for Assigned vs Other Responders
  // -------------------------------------------------------------
  console.log('\n--- TEST SCENARIO: ROLE-BASED VISIBILITY ---');
  const getR1Reqs = (await (await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${loginR1.token}`, 'x-user-id': loginR1.user.id }
  })).json()).requests;

  const getR2Reqs = (await (await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${loginR2.token}`, 'x-user-id': loginR2.user.id }
  })).json()).requests;

  const r1SeesTask = getR1Reqs.some(r => r.id === em1.id);
  const r2SeesTask = getR2Reqs.some(r => r.id === em1.id);

  record(9, 'Assigned Responder 1 sees the auto-assigned task', r1SeesTask);
  record(10, 'Unassigned Responder 2 does NOT see Responder 1 task', !r2SeesTask);

  // -------------------------------------------------------------
  // TEST 11: Admin Sees ALL Emergencies
  // -------------------------------------------------------------
  const getAdminReqs = (await (await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}`, 'x-user-id': adminLogin.user.id }
  })).json()).requests;

  const adminSeesEm1 = getAdminReqs.some(r => r.id === em1.id);
  const adminSeesEmMed = getAdminReqs.some(r => r.id === emMed.id);
  record(11, 'Admin sees all emergencies and auto-assignments', adminSeesEm1 && adminSeesEmMed);

  // -------------------------------------------------------------
  // TEST 12: Workload 3 Tasks is STILL Eligible (Under 4)
  // -------------------------------------------------------------
  console.log('\n--- TEST SCENARIO: WORKLOAD 3 ACTIVE TASKS ELIGIBILITY ---');
  // Give Responder 2 exactly 3 active tasks
  const r2Lat = baseLat + 0.0300;
  const r2Lon = baseLon + 0.0300;
  for (let i = 1; i <= 3; i++) {
    const dummy = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenCit}`, 'x-user-id': userCit.id },
      body: JSON.stringify({ category: 'flood', description: `Task ${i} for R2`, latitude: r2Lat, longitude: r2Lon })
    })).json()).request;

    await fetch(`${API_BASE}/api/requests/${dummy.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ assigned_to: { id: loginR2.user.id, name: resp2.full_name, role: 'RESPONDER' } })
    });
  }

  // Now create an emergency right next to Responder 2 (0.015 km)
  const emNearR2 = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenCit}`, 'x-user-id': userCit.id },
    body: JSON.stringify({
      category: 'trapped_person',
      description: 'Building wall cracked near R2 sector',
      trapped: true,
      latitude: r2Lat + 0.0001,
      longitude: r2Lon + 0.0001
    })
  })).json()).request;

  record(12, 'Responder with 3 active tasks is ELIGIBLE and auto-assigned (4th task)', emNearR2.assigned_to_user_id === loginR2.user.id, `Assigned ID: ${emNearR2.assigned_to_user_id}`);

  // -------------------------------------------------------------
  // TEST 13: If NO eligible responder available -> Leaves PENDING with explanation
  // -------------------------------------------------------------
  console.log('\n--- TEST SCENARIO: NO RESPONDER AVAILABLE ---');
  // Create emergency in remote area with no matching units
  const emRemote = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenCit}`, 'x-user-id': userCit.id },
    body: JSON.stringify({
      category: 'fire_gas', // No fire services registered in test pool
      description: 'Chemical gas leak at remote warehouse',
      latitude: 0,
      longitude: 0
    })
  })).json()).request;

  record(13, 'Unassigned emergency remains in PENDING state without fake assignment', emRemote.status === 'PENDING' && emRemote.assigned_to_user_id === null, `Status: ${emRemote.status}, Explanation: ${emRemote.assignment_explanation}`);

  console.log('\n===============================================================');
  console.log('SUMMARY OF AUTOMATIC ASSIGNMENT TEST SUITE');
  console.log('===============================================================');
  const passed = results.filter(r => r.pass).length;
  console.log(`TOTAL PASSED: ${passed} / ${results.length}`);
}

runTests().catch(console.error);
