const API_BASE = 'http://localhost:5000';

async function runLocationTests() {
  console.log('======================================================');
  console.log('TESTING RESPONDER & VOLUNTEER REAL GPS LOCATION FEATURE');
  console.log('======================================================\n');

  const timestamp = Date.now();

  // 1. Create and login Responder
  const respData = {
    full_name: 'Location Test Responder',
    email: `loc.resp.${timestamp}@varahi.test`,
    phone: `+919611${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    responder_type: 'RESCUE_TEAM'
  };

  await fetch(`${API_BASE}/api/auth/register/responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(respData)
  });

  const respLogin = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: respData.email, password: respData.password, expectedRole: 'RESPONDER' })
  })).json();

  const respId = respLogin.user.id;
  console.log(`Responder Registered & Logged in: id=${respId}`);

  // 2. Test updating Responder GPS coordinates via PATCH /api/responders/:id/location
  const realGpsCoords = {
    latitude: 16.545823,
    longitude: 81.522915,
    is_available: true
  };

  const updateRespRes = await fetch(`${API_BASE}/api/responders/${respId}/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${respLogin.token}`
    },
    body: JSON.stringify(realGpsCoords)
  });

  const updateRespData = await updateRespRes.json();
  const respUpdatePass = updateRespRes.status === 200 &&
    updateRespData.responder?.latitude === realGpsCoords.latitude &&
    updateRespData.responder?.longitude === realGpsCoords.longitude;

  console.log(`[TEST 1] Responder Location Update (PATCH): ${respUpdatePass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   -> Stored Coordinates: (${updateRespData.responder?.latitude}, ${updateRespData.responder?.longitude})`);

  // 3. Verify Responder location in GET /api/responders
  const getRespsRes = await fetch(`${API_BASE}/api/responders`);
  const getRespsData = await getRespsRes.json();
  const foundResp = getRespsData.responders.find(r => r.id === respId || r.user_id === respId);
  const respGetPass = foundResp && foundResp.latitude === realGpsCoords.latitude && foundResp.longitude === realGpsCoords.longitude;

  console.log(`[TEST 2] Responder Location Persistence (GET): ${respGetPass ? '✅ PASS' : '❌ FAIL'}`);

  // 4. Create and login Volunteer
  const volData = {
    full_name: 'Location Test Volunteer',
    email: `loc.vol.${timestamp}@varahi.test`,
    phone: `+919622${timestamp.toString().slice(-6)}`,
    password: 'Password123!',
    capabilities: ['FOOD', 'WATER']
  };

  await fetch(`${API_BASE}/api/auth/register/volunteer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(volData)
  });

  const volLogin = await (await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: volData.email, password: volData.password, expectedRole: 'VOLUNTEER' })
  })).json();

  const volId = volLogin.user.id;
  console.log(`\nVolunteer Registered & Logged in: id=${volId}`);

  // 5. Test updating Volunteer GPS coordinates via PATCH /api/volunteers/:id/location
  const volGpsCoords = {
    latitude: 16.549112,
    longitude: 81.520443,
    is_available: true
  };

  const updateVolRes = await fetch(`${API_BASE}/api/volunteers/${volId}/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${volLogin.token}`
    },
    body: JSON.stringify(volGpsCoords)
  });

  const updateVolData = await updateVolRes.json();
  const volUpdatePass = updateVolRes.status === 200 &&
    updateVolData.volunteer?.latitude === volGpsCoords.latitude &&
    updateVolData.volunteer?.longitude === volGpsCoords.longitude;

  console.log(`[TEST 3] Volunteer Location Update (PATCH): ${volUpdatePass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   -> Stored Coordinates: (${updateVolData.volunteer?.latitude}, ${updateVolData.volunteer?.longitude})`);

  // 6. Verify Volunteer location in GET /api/volunteers
  const getVolsRes = await fetch(`${API_BASE}/api/volunteers`);
  const getVolsData = await getVolsRes.json();
  const foundVol = getVolsData.volunteers.find(v => v.id === volId || v.user_id === volId);
  const volGetPass = foundVol && foundVol.latitude === volGpsCoords.latitude && foundVol.longitude === volGpsCoords.longitude;

  console.log(`[TEST 4] Volunteer Location Persistence (GET): ${volGetPass ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n======================================================');
  console.log('ALL LOCATION TESTS COMPLETE');
  console.log('======================================================');
}

runLocationTests().catch(console.error);
