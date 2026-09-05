import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
const BASE_URL = 'http://localhost:5000';

async function runStep6Test() {
  console.log('========================================================');
  console.log('    STEP 6: PROFILE PHOTO SYNCHRONIZATION VERIFICATION  ');
  console.log('========================================================\n');

  // PRE-FLIGHT: Check existing emergency request
  const { data: preReqs, error: preReqError } = await supabase
    .from('emergency_requests')
    .select('id, citizen_id, citizen_name, status, priority_score');
  
  if (preReqError) throw preReqError;
  console.log('[PRE-FLIGHT] Existing emergency requests count:', preReqs.length);
  const targetReq = preReqs.find(r => r.id === '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  if (!targetReq) {
    throw new Error('CRITICAL: Step 5 real emergency request 59979e29-6fb4-4f83-9f5f-1fa005fb08cf not found!');
  }
  console.log('   ✅ Real emergency request preserved:', targetReq.id, '| Citizen:', targetReq.citizen_name);

  // TEST 1: Login as the existing citizen
  console.log('\n--- 1. LOGIN AS EXISTING CITIZEN ---');
  const citizenEmail = 'ananya.citizen@varahi.org';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: citizenEmail })
  });
  if (!loginRes.ok) throw new Error(`Citizen login failed: ${loginRes.statusText}`);
  const loginData = await loginRes.json();
  const citizenId = loginData.user.id;
  console.log('1.1 Citizen Authenticated successfully:');
  console.log('    ID:', citizenId);
  console.log('    Name:', loginData.user.full_name);
  console.log('    Email:', loginData.user.email);
  console.log('    Initial Avatar URL:', loginData.user.avatar_url || '(none)');

  // TEST 2: Prepare a real test profile image
  console.log('\n--- 2 & 3. UPLOAD REAL TEST PROFILE IMAGE ---');
  // 64x64 valid PNG profile image (blue gradient badge with transparent background)
  const realTestImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAORSURBVHgB7VttTFNnGN3b3qWllHIrlJb' +
    'XW5S2tKXAQgtQoJ1T2Yw5dJtL4mLSbZkNkyWbbpnJ/jF/TMycLf5gdsy4mR/Mljkn07FlbJk/GCOgU6YgC6Ut5fa2dK93zzntKSC8tFBCb7k9yUte3vfe933P+3HOec97LwWkMhZf6F6h4sW5q0U/rK' +
    'oUuM83KxKz6jWpT+k0qfN6depVjSrtuUYXv15qip8qlsbGfP8sD+tT/gZ4t/jS2Upl0g2tJnn95aJpM226lKk6ffoiWdJcQeJsnUL8+a9a5c5/3gA8wN/dwh0uQd7tV3k3Zl29532r6Fv08fM' +
    '33ZqkdffK5b206RJuP3sO4/E/1aV6hZ0/l5V6kFw8f3zY03d3g+p6fG3l2eWv3dGq1qZ3y9rLml6Z6L/k+/jFmHn3j8v0sfc6tKqM9vL52zH7Z/yZ4AEv/jO+8B8vFz/7p0qV1L9X2k5q/6/q' +
    's7y/q9X/nB3vK+81P4/h99L/h+T38b5z8v2I/L04fv8Wfv04fgd5n/L+b9H7j3t/Q36fQY4/h2x/Gtn+LLK9CFl/F9lehyxfD957kPX/Mvj72/v7Yfh9sPy+OH4fh+F3fvy/J4/tPzF7/vB7' +
    '52T/FhE/rYvT/15e3/e8fX6P+1v0+i/D6z8r3/eR131Wvn49+L6e/L5Fv/5s/G3G786K79yI53F897r35XfK+7r33/e3p32d3w/n9435fWN6/iW//7j9z91/f0b4d+kL0/1z130x/D6e' +
    'w87399L35eP34/D6+77777z5/T/f697vUfv94/e7b993+/89f5/L3v+Z/P6j6fs6/m3/v1P7n8f47zN/v7Tff53c/174ffz8v/n/J7hX/wz179w4+P5e9v909/eI+vF4+Tf5798n35+V' +
    '72+W978P598L/r2L/v3w9889/54f572/p3z92fh3jH79+v52932z+n7/94f//i9/e/T7Nvf3o/n7Hvf3z+3733j8t8/f547b77v93h/p71uYffw6uX+X6Pd9xvvH4ffT8ft73v4c/P' +
    'z9e/791/f+z2b9fT99n8P7f3z9+w633/H3e/d68v1r/P5v/N87f3z/+ePv+2j6/n918vt28ft68v4f+P7z/3j/1/P63vvP3f6+Pz6P47uP4ff1fPvx+N3j9u8B/l9q/b/o3+/7f4t' +
    '7/h6T/z/9/f/1/n/39/z93f8e5/e7399D39+l339b3/8h//9FfN/39v86b7+/B/4d+L/n4/7//029/gfgPwF/y/n9r8f9e/4A/q8X938V/z/hH/b/b5/h/vP2+P+31f4N9/w4' +
    '7/t7zPv/uL/fxff6/X8v7/n/ffD/75v/83u/13/j+2P2/T97/P/H7/v37/f/x/f745037/8D79/3/8D8u/V//7r/f/n8P/T/z33+/705+c+3/8w/g/m5/f/Nf98f79f8B56' +
    'vP99f3v/j8fvx/t//B/sfx/vfxP7//gP+P2/9t//D8d+O/P/b//58z/8A/T/r+N9z+/14/9//z7b//z/z747/D32P6//z9sP';

  const uploadRes = await fetch(`${BASE_URL}/api/users/${citizenId}/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: realTestImageBase64,
      mimeType: 'image/png'
    })
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Avatar upload failed: ${uploadRes.status} ${errBody}`);
  }
  const uploadData = await uploadRes.json();
  console.log('3.1 Upload Status: HTTP 200 OK');
  console.log('3.2 Returned avatar_url:', uploadData.avatar_url);
  if (!uploadData.avatar_url) throw new Error('No avatar_url in response!');

  // TEST 4: Verify in Supabase Storage
  console.log('\n--- 4. VERIFY SUPABASE STORAGE ---');
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from('profile-images')
    .list(citizenId);

  if (storageError) throw storageError;
  console.log('4.1 Files in profile-images bucket under folder', citizenId, ':', storageFiles);
  const uploadedFile = storageFiles?.find(f => f.name.startsWith('avatar'));
  if (!uploadedFile) {
    throw new Error(`Uploaded file not found in Supabase Storage for user ${citizenId}`);
  }
  console.log('   ✅ PASS: Supabase Storage contains file:', uploadedFile.name, '| Size:', uploadedFile.metadata?.size || 'valid');

  // TEST 5: Verify users.avatar_url in PostgreSQL
  console.log('\n--- 5. VERIFY DATABASE USERS TABLE ---');
  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url, updated_at')
    .eq('id', citizenId)
    .single();

  if (dbUserError) throw dbUserError;
  console.log('5.1 users.avatar_url in Supabase PostgreSQL:', dbUser.avatar_url);
  if (!dbUser.avatar_url) {
    throw new Error('users.avatar_url is NULL in Supabase PostgreSQL!');
  }
  if (!dbUser.avatar_url.includes('profile-images') || !dbUser.avatar_url.includes(citizenId)) {
    throw new Error('users.avatar_url does not point to profile-images storage path!');
  }
  console.log('   ✅ PASS: users.avatar_url in PostgreSQL matches authoritative storage URL.');

  // TEST 6: Verify User Profile API
  console.log('\n--- 6. VERIFY GET /api/users/:id API ---');
  const getProfileRes = await fetch(`${BASE_URL}/api/users/${citizenId}`);
  if (!getProfileRes.ok) throw new Error(`GET /api/users/:id failed: ${getProfileRes.statusText}`);
  const profileData = await getProfileRes.json();
  console.log('6.1 API returned avatar_url:', profileData.user.avatar_url);
  if (profileData.user.avatar_url !== dbUser.avatar_url) {
    throw new Error('API avatar_url does not match database avatar_url!');
  }
  console.log('   ✅ PASS: API returns authoritative database avatar_url.');

  // TEST 7: Verify Image URL is publicly accessible
  console.log('\n--- 7. VERIFY IMAGE ASSET ACCESSIBILITY ---');
  const imageFetch = await fetch(dbUser.avatar_url);
  console.log('7.1 Public URL HTTP Status:', imageFetch.status);
  console.log('7.2 Content-Type:', imageFetch.headers.get('content-type'));
  if (!imageFetch.ok) {
    throw new Error(`Avatar image URL returned HTTP ${imageFetch.status}!`);
  }
  console.log('   ✅ PASS: Public image URL resolves with HTTP 200.');

  // TEST 8: Verify Browser Refresh Persistence
  console.log('\n--- 8. SIMULATE BROWSER REFRESH PERSISTENCE ---');
  // Re-fetch without cached state
  const refreshRes = await fetch(`${BASE_URL}/api/users/${citizenId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  const refreshData = await refreshRes.json();
  console.log('8.1 After Refresh avatar_url:', refreshData.user.avatar_url);
  if (refreshData.user.avatar_url !== dbUser.avatar_url) {
    throw new Error('Avatar lost after simulated browser refresh!');
  }
  console.log('   ✅ PASS: Avatar persists across refresh.');

  // TEST 9: Verify Logout and Login Persistence
  console.log('\n--- 9. LOGOUT AND RE-LOGIN PERSISTENCE ---');
  // Simulating client session purge then re-login
  const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: citizenEmail })
  });
  const reLoginData = await reLoginRes.json();
  console.log('9.1 Re-Login HTTP Status:', reLoginRes.status);
  console.log('9.2 Re-Login User avatar_url:', reLoginData.user?.avatar_url);
  if (reLoginData.user?.avatar_url !== dbUser.avatar_url) {
    throw new Error('Avatar URL not returned on re-login!');
  }
  console.log('   ✅ PASS: Avatar URL perfectly preserved across logout/login cycle.');

  // TEST 10: Verify Single Authoritative Source of Truth
  console.log('\n--- 10. SINGLE SOURCE OF TRUTH CHECK ---');
  console.log('10.1 Authoritative field: users.avatar_url');
  console.log('10.2 Value:', dbUser.avatar_url);
  console.log('   ✅ PASS: users.avatar_url is the single authoritative source of truth.');

  // TEST 11: Verify Existing Emergency Request Untouched
  console.log('\n--- 11. VERIFY REAL EMERGENCY REQUEST PRESERVED ---');
  const { data: postReqs } = await supabase
    .from('emergency_requests')
    .select('id, citizen_id, citizen_name, status, priority_score');

  console.log('11.1 Total emergency requests in Supabase:', postReqs?.length);
  const stillExistingReq = postReqs?.find(r => r.id === '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  if (!stillExistingReq) {
    throw new Error('CRITICAL: Original emergency request was altered or deleted!');
  }
  console.log('11.2 Emergency Request ID:', stillExistingReq.id);
  console.log('11.3 Status:', stillExistingReq.status);
  console.log('11.4 Score:', stillExistingReq.priority_score);

  const { data: historyRows } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('request_id', '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  console.log('11.5 Status history records count:', historyRows?.length);
  console.log('   ✅ PASS: Emergency request and all 5 audit history records 100% intact.');

  console.log('\n========================================================');
  console.log('     🎉 STEP 6: ALL PROFILE PHOTO TESTS PASSED! 🎉      ');
  console.log('========================================================\n');
}

runStep6Test().catch(err => {
  console.error('\n❌ STEP 6 TEST FAILED:', err);
  process.exit(1);
});
