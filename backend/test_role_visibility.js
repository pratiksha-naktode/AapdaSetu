const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('===============================================================');
  console.log('STARTING ROLE-BASED REQUEST / TASK VISIBILITY VALIDATION SUITE');
  console.log('===============================================================\n');

  const timestamp = Date.now();

  // 1. Citizen A & Citizen B registration & login
  console.log('1. Registering & Logging in Citizen A and Citizen B...');
  const citA = {
    full_name: 'Citizen Alpha',
    email: `citizen.a.${timestamp}@varahi.test`,
    phone: `+919811${timestamp.toString().slice(-6)}`,
    password: 'Password123!'
  };
  const citB = {
    full_name: 'Citizen Beta',
    email: `citizen.b.${timestamp}@varahi.test`,
    phone: `+919822${timestamp.toString().slice(-6)}`,
    password: 'Password123!'
  };

  await fetch(`${API_BASE}/api/auth/register/citizen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(citA)
  });
  await fetch(`${API_BASE}/api/auth/register/citizen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(citB)
  });

  const loginResA = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: citA.email, password: citA.password, expectedRole: 'CITIZEN' })
  });
  const loginDataA = await loginResA.json();
  const tokenA = loginDataA.token;
  const userA = loginDataA.user;

  const loginResB = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: citB.email, password: citB.password, expectedRole: 'CITIZEN' })
  });
  const loginDataB = await loginResB.json();
  const tokenB = loginDataB.token;
  const userB = loginDataB.user;

  console.log(`Citizen A Logged in: id=${userA.id}, name=${userA.full_name}`);
  console.log(`Citizen B Logged in: id=${userB.id}, name=${userB.full_name}`);

  // 2. Submit emergency A as Citizen A, emergency B as Citizen B
  console.log('\n2. Citizen A submits Emergency A, Citizen B submits Emergency B...');
  const reqResA = await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`,
      'x-user-id': userA.id
    },
    body: JSON.stringify({
      category: 'medical',
      description: 'Emergency A: Severe chest pain and breathing issues at Ward 4',
      people_count: 1,
      latitude: 16.5449,
      longitude: 81.5212,
      address: 'Ward 4, Bhimavaram'
    })
  });
  const emA = (await reqResA.json()).request;

  const reqResB = await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`,
      'x-user-id': userB.id
    },
    body: JSON.stringify({
      category: 'flood',
      description: 'Emergency B: Flood water entered ground floor at Ward 9',
      people_count: 4,
      latitude: 16.5480,
      longitude: 81.5285,
      address: 'Ward 9, Bhimavaram'
    })
  });
  const emB = (await reqResB.json()).request;

  console.log(`Emergency A created: id=${emA.id}, citizen_id=${emA.citizen_id}`);
  console.log(`Emergency B created: id=${emB.id}, citizen_id=${emB.citizen_id}`);

  // 3. Citizen visibility tests
  console.log('\n3. Testing Citizen Data Isolation (GET /api/requests)...');
  const getCitAReqs = await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenA}`, 'x-user-id': userA.id }
  });
  const listCitA = (await getCitAReqs.json()).requests;
  const citAHasA = listCitA.some(r => r.id === emA.id);
  const citAHasB = listCitA.some(r => r.id === emB.id);

  console.log(`[TEST 1.1] Citizen A sees Emergency A: ${citAHasA ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 1.2] Citizen A does NOT see Emergency B: ${!citAHasB ? '✅ PASS' : '❌ FAIL'}`);

  const getCitBReqs = await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenB}`, 'x-user-id': userB.id }
  });
  const listCitB = (await getCitBReqs.json()).requests;
  const citBHasB = listCitB.some(r => r.id === emB.id);
  const citBHasA = listCitB.some(r => r.id === emA.id);

  console.log(`[TEST 1.3] Citizen B sees Emergency B: ${citBHasB ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 1.4] Citizen B does NOT see Emergency A: ${!citBHasA ? '✅ PASS' : '❌ FAIL'}`);

  // 4. Volunteer / Responder setup & task assignment
  console.log('\n4. Setting up Volunteer A and Volunteer B...');
  const volA = {
    full_name: 'Volunteer Alpha',
    email: `vol.a.${timestamp}@varahi.test`,
    phone: `+919833${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    capabilities: ['FOOD', 'WATER'],
    vehicle_type: 'Van'
  };
  const volB = {
    full_name: 'Volunteer Beta',
    email: `vol.b.${timestamp}@varahi.test`,
    phone: `+919844${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    capabilities: ['FIRST_AID', 'MEDICINE'],
    vehicle_type: 'Motorcycle'
  };

  await fetch(`${API_BASE}/api/auth/register/volunteer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(volA)
  });
  await fetch(`${API_BASE}/api/auth/register/volunteer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(volB)
  });

  const loginVolA = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: volA.email, password: volA.password, expectedRole: 'VOLUNTEER' })
  })).json();
  const tokenVolA = loginVolA.token;
  const userVolA = loginVolA.user;

  const loginVolB = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: volB.email, password: volB.password, expectedRole: 'VOLUNTEER' })
  })).json();
  const tokenVolB = loginVolB.token;
  const userVolB = loginVolB.user;

  console.log(`Volunteer A Logged in: id=${userVolA.id}, name=${userVolA.full_name}`);
  console.log(`Volunteer B Logged in: id=${userVolB.id}, name=${userVolB.full_name}`);

  // Create an unassigned emergency C
  const emC = (await (await fetch(`${API_BASE}/api/requests/emergency`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`,
      'x-user-id': userA.id
    },
    body: JSON.stringify({
      category: 'supplies',
      description: 'Emergency C: Unassigned request for drinking water',
      people_count: 2,
      latitude: 16.5449,
      longitude: 81.5212,
      address: 'Ward 1'
    })
  })).json()).request;
  console.log(`Unassigned Emergency C created: id=${emC.id}`);

  // Admin logs in
  const adminLogin = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@varahi.org', password: 'Password123!', expectedRole: 'ADMIN' })
  })).json();
  const tokenAdmin = adminLogin.token;
  const userAdmin = adminLogin.user;

  // Assign Emergency A -> Volunteer A
  await fetch(`${API_BASE}/api/requests/${emA.id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
    body: JSON.stringify({
      assigned_to: { id: userVolA.id, name: userVolA.full_name, role: 'VOLUNTEER' }
    })
  });

  // Assign Emergency B -> Volunteer B
  await fetch(`${API_BASE}/api/requests/${emB.id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
    body: JSON.stringify({
      assigned_to: { id: userVolB.id, name: userVolB.full_name, role: 'VOLUNTEER' }
    })
  });

  console.log(`Assigned Emergency A -> Volunteer A (${userVolA.id})`);
  console.log(`Assigned Emergency B -> Volunteer B (${userVolB.id})`);

  // 5. Volunteer visibility tests
  console.log('\n5. Testing Volunteer Assigned-Task Filtering (GET /api/requests)...');
  const getVolAReqs = await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenVolA}`, 'x-user-id': userVolA.id }
  });
  const listVolA = (await getVolAReqs.json()).requests;
  const volAHasA = listVolA.some(r => r.id === emA.id);
  const volAHasB = listVolA.some(r => r.id === emB.id);
  const volAHasC = listVolA.some(r => r.id === emC.id);

  console.log(`[TEST 2.1] Volunteer A sees assigned Emergency A: ${volAHasA ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 2.2] Volunteer A does NOT see Emergency B: ${!volAHasB ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 2.3] Volunteer A does NOT see unassigned Emergency C: ${!volAHasC ? '✅ PASS' : '❌ FAIL'}`);

  const getVolBReqs = await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenVolB}`, 'x-user-id': userVolB.id }
  });
  const listVolB = (await getVolBReqs.json()).requests;
  const volBHasB = listVolB.some(r => r.id === emB.id);
  const volBHasA = listVolB.some(r => r.id === emA.id);
  const volBHasC = listVolB.some(r => r.id === emC.id);

  console.log(`[TEST 2.4] Volunteer B sees assigned Emergency B: ${volBHasB ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 2.5] Volunteer B does NOT see Emergency A: ${!volBHasA ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 2.6] Volunteer B does NOT see unassigned Emergency C: ${!volBHasC ? '✅ PASS' : '❌ FAIL'}`);

  // 6. Admin visibility test
  console.log('\n6. Testing Admin Full Visibility (GET /api/requests)...');
  const getAdminReqs = await fetch(`${API_BASE}/api/requests`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}`, 'x-user-id': userAdmin.id }
  });
  const listAdmin = (await getAdminReqs.json()).requests;
  const adminHasA = listAdmin.some(r => r.id === emA.id);
  const adminHasB = listAdmin.some(r => r.id === emB.id);
  const adminHasC = listAdmin.some(r => r.id === emC.id);

  console.log(`[TEST 3.1] Admin sees Emergency A: ${adminHasA ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 3.2] Admin sees Emergency B: ${adminHasB ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[TEST 3.3] Admin sees unassigned Emergency C: ${adminHasC ? '✅ PASS' : '❌ FAIL'}`);

  // 7. Security: Direct ID access authorization tests (GET /api/requests/:id)
  console.log('\n7. Testing Direct ID Authorization & 403 Rejections (GET /api/requests/:id)...');
  // Citizen A tries to fetch Emergency B
  const directCitAtoB = await fetch(`${API_BASE}/api/requests/${emB.id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}`, 'x-user-id': userA.id }
  });
  console.log(`[TEST 4.1] Citizen A accessing Citizen B emergency -> HTTP ${directCitAtoB.status}: ${directCitAtoB.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL'}`);

  // Citizen B tries to fetch Emergency A
  const directCitBtoA = await fetch(`${API_BASE}/api/requests/${emA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}`, 'x-user-id': userB.id }
  });
  console.log(`[TEST 4.2] Citizen B accessing Citizen A emergency -> HTTP ${directCitBtoA.status}: ${directCitBtoA.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL'}`);

  // Volunteer A tries to fetch Emergency B
  const directVolAtoB = await fetch(`${API_BASE}/api/requests/${emB.id}`, {
    headers: { 'Authorization': `Bearer ${tokenVolA}`, 'x-user-id': userVolA.id }
  });
  console.log(`[TEST 4.3] Volunteer A accessing Volunteer B task -> HTTP ${directVolAtoB.status}: ${directVolAtoB.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL'}`);

  // Volunteer A tries to fetch unassigned Emergency C
  const directVolAtoC = await fetch(`${API_BASE}/api/requests/${emC.id}`, {
    headers: { 'Authorization': `Bearer ${tokenVolA}`, 'x-user-id': userVolA.id }
  });
  console.log(`[TEST 4.4] Volunteer A accessing unassigned task -> HTTP ${directVolAtoC.status}: ${directVolAtoC.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL'}`);

  // Admin tries to fetch Emergency A
  const directAdminA = await fetch(`${API_BASE}/api/requests/${emA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}`, 'x-user-id': userAdmin.id }
  });
  console.log(`[TEST 4.5] Admin accessing Emergency A -> HTTP ${directAdminA.status}: ${directAdminA.status === 200 ? '✅ PASS (200 OK)' : '❌ FAIL'}`);

  console.log('\n===============================================================');
  console.log('ROLE-BASED VISIBILITY & DATA ISOLATION TESTS COMPLETE');
  console.log('===============================================================');
}

runTests().catch(console.error);
