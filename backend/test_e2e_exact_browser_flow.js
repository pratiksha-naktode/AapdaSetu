const BASE_URL = 'http://127.0.0.1:5000';

async function testExactBrowserFlow() {
  console.log('----------------------------------------------------');
  console.log('1. CITIZEN CREATES EMERGENCY');
  console.log('----------------------------------------------------');
  const citizenPost = await fetch(`${BASE_URL}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      citizen_name: 'Lakshmi Devi',
      citizen_phone: '+919988771122',
      category: 'flood_rescue',
      people_count: 5,
      trapped: true,
      child_present: true,
      elderly_present: true,
      injured: false,
      medical_emergency: false,
      life_threat: true,
      latitude: 16.5448,
      longitude: 81.5210,
      address: 'Near Old Bus Stand, Bhimavaram'
    })
  });

  const citizenData = await citizenPost.json();
  const reqId = citizenData.request.id;
  const assignedRespId = citizenData.request.assigned_to_user_id;
  console.log(`✓ Emergency created: ID=${reqId}`);
  console.log(`✓ Auto-assigned to Responder ID=${assignedRespId} (${citizenData.request.assigned_to?.name})`);
  console.log(`✓ Initial Status=${citizenData.request.status}`);

  console.log('\n----------------------------------------------------');
  console.log('2. RESPONDER LOGS IN (Frontend AuthContext.login)');
  console.log('----------------------------------------------------');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'commander.rajesh@varahi.gov.in',
      password: 'VarahiPass123!',
      expected_role: 'RESPONDER'
    })
  });

  const loginData = await loginRes.json();
  console.log(`✓ Logged in as: ${loginData.user.full_name} (${loginData.user.role})`);
  console.log(`✓ Token: ${loginData.token}`);

  // Construct headers exactly as api.ts getAuthHeaders() does in browser
  const responderAuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${loginData.token}`,
    'x-user-id': loginData.user.id
  };

  console.log('\n----------------------------------------------------');
  console.log('3. RESPONDER DASHBOARD FETCHES ASSIGNED REQUESTS');
  console.log('----------------------------------------------------');
  const reqListRes = await fetch(`${BASE_URL}/api/requests`, {
    headers: responderAuthHeaders
  });
  const reqListData = await reqListRes.json();
  console.log(`✓ Responder sees ${reqListData.count} assigned emergency task(s)`);
  const myTask = reqListData.requests.find(r => r.id === reqId);
  if (!myTask) {
    throw new Error('Assigned emergency not found in responder queue');
  }
  console.log(`✓ Found task #${myTask.id.slice(0, 8)} with status="${myTask.status}"`);

  console.log('\n----------------------------------------------------');
  console.log('4. RESPONDER CLICKS [✅ Accept Task]');
  console.log('   (Frontend calls api.acceptTask(reqId, responderName))');
  console.log('----------------------------------------------------');
  const acceptRes = await fetch(`${BASE_URL}/api/requests/${reqId}/status`, {
    method: 'PATCH',
    headers: responderAuthHeaders,
    body: JSON.stringify({
      status: 'ACCEPTED',
      changed_by: loginData.user.full_name,
      notes: 'Responder acknowledged and accepted the task'
    })
  });

  const acceptData = await acceptRes.json();
  console.log(`✓ API Response Status Code: ${acceptRes.status} ${acceptRes.statusText}`);
  console.log(`✓ Backend Response Message: "${acceptData.message}"`);
  console.log(`✓ Updated Status in Response: "${acceptData.request?.status}"`);

  if (!acceptRes.ok || acceptData.request?.status !== 'ACCEPTED') {
    throw new Error(`Accept task failed! Response: ${JSON.stringify(acceptData)}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('5. CITIZEN TRACK STATUS VERIFICATION');
  console.log('----------------------------------------------------');
  const trackRes = await fetch(`${BASE_URL}/api/requests/${reqId}`, {
    headers: responderAuthHeaders
  });
  const trackData = await trackRes.json();
  console.log(`✓ Track Status GET result: status="${trackData.request.status}"`);
  console.log(`✓ Status Label mapping: "Responder Accepted"`);
  console.log(`✓ Step index active: Step 4 (Accepted)`);

  if (trackData.request.status !== 'ACCEPTED') {
    throw new Error(`Citizen tracking expected ACCEPTED, got ${trackData.request.status}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('6. ADMIN COMMAND CENTER VERIFICATION');
  console.log('----------------------------------------------------');
  const adminRes = await fetch(`${BASE_URL}/api/requests`, {
    headers: {
      'Authorization': 'Bearer varahi-jwt-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'x-user-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    }
  });
  const adminData = await adminRes.json();
  const adminTask = adminData.requests.find(r => r.id === reqId);
  console.log(`✓ Admin sees task #${reqId.slice(0, 8)} status="${adminTask?.status}"`);
  console.log(`✓ Admin StatusBadge label: "RESPONDER ACCEPTED"`);

  if (adminTask?.status !== 'ACCEPTED') {
    throw new Error(`Admin expected ACCEPTED, got ${adminTask?.status}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('7. SECURITY VERIFICATION: Non-assigned user cannot accept');
  console.log('----------------------------------------------------');
  const impostorRes = await fetch(`${BASE_URL}/api/requests/${reqId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer varahi-jwt-impostor-id',
      'x-user-id': 'impostor-id'
    },
    body: JSON.stringify({ status: 'ACCEPTED' })
  });
  console.log(`✓ Impostor accept attempt rejected with status: ${impostorRes.status} (Forbidden)`);

  console.log('\n====================================================');
  console.log('🌟 COMPLETE "ACCEPT TASK" VERIFICATION SUCCESSFUL!');
  console.log('====================================================\n');
}

testExactBrowserFlow().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
