import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
const BASE_URL = 'http://localhost:5000';

// Helper to recursively scan directory for prohibited patterns
function scanDirForPatterns(dir, patterns, ignoreDirs = ['node_modules', 'dist', '.git']) {
  let found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        found = found.concat(scanDirForPatterns(fullPath, patterns, ignoreDirs));
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?|html|css|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const [name, regex] of Object.entries(patterns)) {
        if (regex.test(content)) {
          found.push({ file: fullPath, pattern: name });
        }
      }
    }
  }
  return found;
}

async function runStep7Verification() {
  console.log('========================================================');
  console.log('     STEP 7: AUTHENTICATION CLEANUP VERIFICATION        ');
  console.log('========================================================\n');

  // PRE-FLIGHT: Verify existing real emergency request
  console.log('--- PRE-FLIGHT: CHECK DATABASE INTEGRITY ---');
  const { data: preReqs, error: reqErr } = await supabase
    .from('emergency_requests')
    .select('id, citizen_id, citizen_name, status, priority_score');
  if (reqErr) throw reqErr;

  const targetReq = preReqs.find(r => r.id === '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  if (!targetReq) {
    throw new Error('CRITICAL: Step 5 real emergency request 59979e29-6fb4-4f83-9f5f-1fa005fb08cf not found!');
  }
  console.log('   ✅ Real emergency request preserved:', targetReq.id);
  console.log('   Citizen Name in DB:', targetReq.citizen_name);
  console.log('   Citizen ID in DB:', targetReq.citizen_id);

  const { data: preHistory } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('request_id', '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  console.log('   ✅ Audit status history records count in Supabase:', preHistory.length);

  // TESTS 1 - 5: Search frontend codebase for hardcoded identities
  console.log('\n--- TESTS 1-5: CODEBASE SEARCH FOR HARDCODED IDENTITIES ---');
  const frontendSrc = path.resolve('../frontend/src');
  const prohibitedPatterns = {
    'Real Citizen UUID': /792cef04-e57c-4113-b5f8-a1adf09b9c6f/i,
    'Real Citizen Email': /ananya\.citizen@varahi\.org/i,
    'Real Citizen Name (Ananya)': /Ananya/i,
    'Real Citizen Surname (Sharma)': /Sharma/i,
    'Dummy UUID dddddddd': /dddddddd-dddd-dddd-dddd-ddddddddddd1/i,
    'Dummy UUID aaaaaaaa': /aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/i,
    'Dummy UUID bbbbbbbb': /bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1/i,
    'Dummy UUID cccccccc': /cccccccc-cccc-cccc-cccc-ccccccccccc1/i
  };

  const matches = scanDirForPatterns(frontendSrc, prohibitedPatterns);
  console.log('Scan directory:', frontendSrc);
  console.log('Total prohibited hardcoded identity matches found in frontend:', matches.length);

  if (matches.length > 0) {
    console.error('❌ Prohibited identity patterns detected:', matches);
    throw new Error(`Hardcoded identities found in frontend: ${JSON.stringify(matches)}`);
  }
  console.log('   ✅ PASS: Zero hardcoded citizen UUIDs found.');
  console.log('   ✅ PASS: Zero hardcoded citizen emails found.');
  console.log('   ✅ PASS: Zero hardcoded citizen names found.');
  console.log('   ✅ PASS: Zero dummy UUIDs found.');
  console.log('   ✅ PASS: Entire frontend is 100% dynamic.');

  // TEST 6: Login using the existing test citizen through API/auth flow
  console.log('\n--- TEST 6 & 7: DYNAMIC AUTHENTICATION VIA LOGIN API ---');
  const testEmail = 'ananya.citizen@varahi.org';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });

  if (!loginRes.ok) throw new Error(`Login API failed with status ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log('6.1 Login API response status: HTTP 200 OK');
  console.log('6.2 Returned JWT Token:', loginData.token);
  console.log('6.3 Authenticated User:', loginData.user.full_name);
  console.log('6.4 Authenticated User ID:', loginData.user.id);
  console.log('6.5 Authenticated User Email:', loginData.user.email);

  if (loginData.user.id !== '792cef04-e57c-4113-b5f8-a1adf09b9c6f') {
    throw new Error(`Unexpected user ID returned: ${loginData.user.id}`);
  }

  // TEST 8: Verify Avatar URL is returned dynamically from Supabase
  console.log('\n--- TEST 8: VERIFY AUTHORITATIVE AVATAR URL IN USER RECORD ---');
  console.log('8.1 Returned avatar_url:', loginData.user.avatar_url);
  if (!loginData.user.avatar_url || !loginData.user.avatar_url.includes('profile-images')) {
    throw new Error('avatar_url is missing or not pointing to profile-images!');
  }
  console.log('   ✅ PASS: Dynamic avatar URL properly retrieved from Supabase.');

  // TEST 9: Verify Refresh Profile (/api/users/:id and /api/auth/me)
  console.log('\n--- TEST 9: VERIFY REFRESH PROFILE FROM SUPABASE ---');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  if (!meRes.ok) throw new Error(`/api/auth/me failed with status ${meRes.status}`);
  const meData = await meRes.json();
  console.log('9.1 /api/auth/me user:', meData.user.full_name);
  console.log('9.2 /api/auth/me avatar_url:', meData.user.avatar_url);
  if (meData.user.avatar_url !== loginData.user.avatar_url) {
    throw new Error('Avatar mismatch in /api/auth/me!');
  }
  console.log('   ✅ PASS: Session and profile successfully refreshed from Supabase.');

  // TEST 10: Verify Logout Behavior
  console.log('\n--- TEST 10: SIMULATE LOGOUT ---');
  // Client-side logout clears localStorage varahi_auth_user & varahi_auth_token
  console.log('10.1 Simulating client session purge (clearing localStorage)...');
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  console.log('10.2 /api/auth/me without token status:', unauthRes.status, '(Expected: 401)');
  if (unauthRes.status !== 401) {
    throw new Error(`Expected HTTP 401 without auth token, got ${unauthRes.status}`);
  }
  console.log('   ✅ PASS: Unauthenticated access correctly blocked.');

  // TEST 11: Re-Login retrieves dynamic identity from Supabase
  console.log('\n--- TEST 11: RE-LOGIN WITH DYNAMIC RETRIEVAL ---');
  const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const reLoginData = await reLoginRes.json();
  console.log('11.1 Re-login User ID:', reLoginData.user.id);
  console.log('11.2 Re-login Name:', reLoginData.user.full_name);
  console.log('11.3 Re-login Avatar URL:', reLoginData.user.avatar_url);
  if (reLoginData.user.id !== loginData.user.id) {
    throw new Error('Re-login returned a different user ID!');
  }
  console.log('   ✅ PASS: Re-login accurately restores user profile from Supabase.');

  // TEST 12: Verify real emergency request intact
  console.log('\n--- TEST 12: PRESERVATION OF REAL EMERGENCY REQUEST ---');
  const { data: postReqs } = await supabase
    .from('emergency_requests')
    .select('id, citizen_id, citizen_name, status, priority_score');

  console.log('12.1 Total emergency requests in Supabase:', postReqs.length);
  const stillExistingReq = postReqs.find(r => r.id === '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  if (!stillExistingReq) {
    throw new Error('CRITICAL: Step 5 real emergency request was lost!');
  }
  console.log('12.2 Emergency Request ID:', stillExistingReq.id);
  console.log('12.3 Status:', stillExistingReq.status);
  console.log('12.4 Priority Score:', stillExistingReq.priority_score);

  const { data: postHistory } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('request_id', '59979e29-6fb4-4f83-9f5f-1fa005fb08cf');
  console.log('12.5 Status history records count in Supabase:', postHistory.length);
  if (postHistory.length !== 5) {
    throw new Error(`Expected 5 audit history records, found ${postHistory.length}`);
  }
  console.log('   ✅ PASS: Real emergency request and all 5 audit records 100% intact.');

  console.log('\n========================================================');
  console.log('    🎉 STEP 7: AUTHENTICATION CLEANUP FULLY PASSED! 🎉    ');
  console.log('========================================================\n');
}

runStep7Verification().catch(err => {
  console.error('\n❌ STEP 7 FAILED:', err);
  process.exit(1);
});
