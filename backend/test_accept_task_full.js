const BASE_URL = 'http://127.0.0.1:5000';

async function testAcceptTaskFlow() {
  console.log('=== STEP 1: Citizen creates emergency request ===');
  const citizenPayload = {
    citizen_name: 'Test Citizen Varahi',
    citizen_phone: '+919988776655',
    category: 'flood_rescue',
    people_count: 3,
    trapped: true,
    child_present: true,
    elderly_present: false,
    injured: false,
    medical_emergency: false,
    life_threat: true,
    latitude: 16.5415,
    longitude: 81.5245,
    address: 'Near DNR College, Bhimavaram'
  };

  const createRes = await fetch(`${BASE_URL}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(citizenPayload)
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.request) {
    throw new Error(`Failed to create emergency request: ${JSON.stringify(createData)}`);
  }

  const req = createData.request;
  console.log(`✓ Request created: #${req.id} (Status: ${req.status})`);
  console.log(`  Assigned to: ${req.assigned_to?.name || 'N/A'} (ID: ${req.assigned_to_user_id})`);

  if (req.status !== 'ASSIGNED' || !req.assigned_to_user_id) {
    throw new Error(`Request was expected to be auto-assigned, got status=${req.status}`);
  }

  const assignedResponderId = req.assigned_to_user_id;

  console.log('\n=== STEP 2: Security check — Unauthorized / wrong user attempts to accept ===');
  // Attempt with wrong user
  const wrongRes = await fetch(`${BASE_URL}/api/requests/${req.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer varahi-jwt-unauthorized-user-999',
      'x-user-id': 'unauthorized-user-999'
    },
    body: JSON.stringify({
      status: 'ACCEPTED',
      changed_by: 'Impostor'
    })
  });

  if (wrongRes.status !== 403) {
    const wrongText = await wrongRes.text();
    throw new Error(`Security breach: expected 403 for unauthorized user, got ${wrongRes.status}: ${wrongText}`);
  }
  console.log(`✓ Correctly rejected unauthorized accept with 403 Forbidden`);

  // Attempt without auth header
  const noAuthRes = await fetch(`${BASE_URL}/api/requests/${req.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED' })
  });

  if (noAuthRes.status !== 401 && noAuthRes.status !== 403) {
    throw new Error(`Expected 401/403 without auth, got ${noAuthRes.status}`);
  }
  console.log(`✓ Correctly rejected unauthenticated request with ${noAuthRes.status}`);

  console.log('\n=== STEP 3: Assigned responder accepts the task ===');
  const acceptRes = await fetch(`${BASE_URL}/api/requests/${req.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer varahi-jwt-${assignedResponderId}`,
      'x-user-id': assignedResponderId
    },
    body: JSON.stringify({
      status: 'ACCEPTED',
      changed_by: req.assigned_to?.name || 'Assigned Responder',
      notes: 'Responder acknowledged and accepted the task'
    })
  });

  const acceptData = await acceptRes.json();
  if (!acceptRes.ok) {
    throw new Error(`Accept task failed with status ${acceptRes.status}: ${JSON.stringify(acceptData)}`);
  }

  console.log(`✓ Accept Task API returned 200 OK: ${acceptData.message}`);
  console.log(`  Updated Status: ${acceptData.request.status}`);

  if (acceptData.request.status !== 'ACCEPTED') {
    throw new Error(`Expected status ACCEPTED, got ${acceptData.request.status}`);
  }

  console.log('\n=== STEP 4: Verify persistence & Citizen Track Status ===');
  const verifyRes = await fetch(`${BASE_URL}/api/requests/${req.id}`, {
    headers: {
      'Authorization': `Bearer varahi-jwt-${assignedResponderId}`,
      'x-user-id': assignedResponderId
    }
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.request) {
    throw new Error(`Failed to retrieve request details: ${JSON.stringify(verifyData)}`);
  }

  console.log(`✓ Verification GET /api/requests/${req.id}: Status is "${verifyData.request.status}"`);
  if (verifyData.request.status !== 'ACCEPTED') {
    throw new Error(`Expected persisted status ACCEPTED, got ${verifyData.request.status}`);
  }

  console.log('\n=== STEP 5: Verify Admin sees updated status ===');
  const adminRes = await fetch(`${BASE_URL}/api/requests`, {
    headers: {
      'Authorization': 'Bearer varahi-jwt-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'x-user-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    }
  });
  const adminData = await adminRes.json();
  const foundInAdmin = adminData.requests?.find(r => r.id === req.id);
  if (!foundInAdmin) {
    throw new Error(`Admin could not find request #${req.id} in requests list`);
  }
  console.log(`✓ Admin sees request #${req.id} with status: "${foundInAdmin.status}"`);
  if (foundInAdmin.status !== 'ACCEPTED') {
    throw new Error(`Admin saw status ${foundInAdmin.status} instead of ACCEPTED`);
  }

  console.log('\n=== STEP 6: Subsequent workflow — ON_THE_WAY and RESOLVED ===');
  const onTheWayRes = await fetch(`${BASE_URL}/api/requests/${req.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer varahi-jwt-${assignedResponderId}`,
      'x-user-id': assignedResponderId
    },
    body: JSON.stringify({ status: 'ON_THE_WAY', changed_by: req.assigned_to?.name })
  });
  const onTheWayData = await onTheWayRes.json();
  console.log(`✓ Status transitioned to: ${onTheWayData.request.status}`);

  const resolvedRes = await fetch(`${BASE_URL}/api/requests/${req.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer varahi-jwt-${assignedResponderId}`,
      'x-user-id': assignedResponderId
    },
    body: JSON.stringify({ status: 'RESOLVED', changed_by: req.assigned_to?.name })
  });
  const resolvedData = await resolvedRes.json();
  console.log(`✓ Status transitioned to: ${resolvedData.request.status}`);

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

testAcceptTaskFlow().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
