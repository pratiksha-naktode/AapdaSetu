/**
 * Verification Test: Fake Data Removal & Persistent Profile Photo
 */

const BASE_URL = 'http://127.0.0.1:5000';

async function testAll() {
  console.log('=== STARTING CLEANUP & PROFILE VERIFICATION ===\n');

  // Test 1, 2, 3: Empty Database State
  console.log('1. Checking Empty Database State (No fake requests)...');
  const reqRes = await fetch(`${BASE_URL}/api/requests`);
  const reqData = await reqRes.json();
  console.log(`   Requests count: ${reqData.requests.length} (Expected: 0)`);
  if (reqData.requests.length !== 0) throw new Error('Database is NOT empty! Fake requests found.');

  const statsRes = await fetch(`${BASE_URL}/api/dashboard/statistics`);
  const statsData = await statsRes.json();
  console.log('   Stats:', statsData.statistics);
  if (statsData.statistics.total_requests !== 0 || statsData.statistics.critical_requests !== 0) {
    throw new Error('Stats do not equal 0 on empty database!');
  }
  console.log('   ✅ PASS: Initial database is 100% empty, 0 fake requests.');

  // Test 4: Citizen creates real emergency request
  console.log('\n2. Citizen creating real emergency request...');
  const emPayload = {
    citizen_name: 'Anil Varma',
    citizen_phone: '+919876543210',
    category: 'trapped_person',
    people_count: 3,
    trapped: true,
    life_threat: true,
    child_present: true,
    injured: false,
    address: 'Bhimavaram Colony Ward 4'
  };
  const emRes = await fetch(`${BASE_URL}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emPayload)
  });
  const emData = await emRes.json();
  console.log('   Created Emergency ID:', emData.request.id, '| Score:', emData.request.priority_score, '| Level:', emData.request.priority_level);

  // Verify it appears in Responder & Admin dashboard
  const afterEm = await fetch(`${BASE_URL}/api/requests?type=EMERGENCY`);
  const afterEmData = await afterEm.json();
  if (afterEmData.requests.length !== 1 || afterEmData.requests[0].id !== emData.request.id) {
    throw new Error('Emergency request did not appear in responder queue!');
  }
  console.log('   ✅ PASS: Real emergency request appears in Responder queue.');

  // Test 5: Citizen creates real resource request
  console.log('\n3. Citizen creating real resource request...');
  const resPayload = {
    citizen_name: 'Savitri Devi',
    citizen_phone: '+919876543211',
    category: 'water',
    requested_resource: 'Drinking Water Cans',
    people_count: 4,
    elderly_present: false,
    child_present: true,
    address: 'Near Someswara Temple, Bhimavaram'
  };
  const resRes = await fetch(`${BASE_URL}/api/requests/resource`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resPayload)
  });
  const resData = await resRes.json();
  console.log('   Created Resource ID:', resData.request.id, '| Score:', resData.request.priority_score, '| Level:', resData.request.priority_level);

  const afterRes = await fetch(`${BASE_URL}/api/requests?type=RESOURCE`);
  const afterResData = await afterRes.json();
  if (afterResData.requests.length !== 1 || afterResData.requests[0].id !== resData.request.id) {
    throw new Error('Resource request did not appear in volunteer queue!');
  }
  console.log('   ✅ PASS: Real resource request appears in Volunteer queue.');

  // Test 6, 7, 8: Persistent Profile Photo Upload & Retrieval
  console.log('\n4. Testing Persistent Profile Photo Upload...');
  const userId = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  // 1x1 test PNG
  const sampleAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wH4SBgYEBDAwNAAUBA/8F48fQAAAAAElFTkSuQmCC';

  const avatarUploadRes = await fetch(`${BASE_URL}/api/users/${userId}/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: sampleAvatarBase64,
      mimeType: 'image/png'
    })
  });
  const uploadData = await avatarUploadRes.json();
  console.log('   Upload Response Status:', avatarUploadRes.status);
  console.log('   Returned avatar_url:', uploadData.avatar_url);
  if (!uploadData.avatar_url) throw new Error('No avatar_url returned!');

  // Verify persistence via GET /api/users/:id
  console.log('\n5. Verifying avatar persistence (simulating browser reload / re-login)...');
  const userRes = await fetch(`${BASE_URL}/api/users/${userId}`);
  const userData = await userRes.json();
  console.log('   User Profile avatar_url:', userData.user.avatar_url);
  if (userData.user.avatar_url !== uploadData.avatar_url) {
    throw new Error('Avatar was not persisted in user profile record!');
  }

  // Verify the static URL is reachable
  const imageFetchRes = await fetch(userData.user.avatar_url);
  console.log('   Avatar image asset HTTP status:', imageFetchRes.status);
  if (!imageFetchRes.ok) throw new Error('Avatar image URL is not reachable!');
  console.log('   ✅ PASS: Avatar uploaded, persisted to storage, and accessible via URL.');

  console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! ZERO FAKE DATA. REAL PERSISTENCE VERIFIED. 🎉\n');
}

testAll().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
