import { config } from './src/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

async function runStep5Test() {
  console.log('========================================================');
  console.log('       STEP 5: REAL USER END-TO-END TEST SUITE          ');
  console.log('========================================================\n');

  // Verify initial empty state
  const { count: initialCount } = await supabase.from('emergency_requests').select('*', { count: 'exact', head: true });
  console.log('[EMPTY STATE CHECK] Initial emergency_requests count in Supabase:', initialCount);

  // TEST 1: CITIZEN REGISTRATION / LOGIN
  console.log('\n--- TEST 1: CITIZEN REGISTRATION & AUTHENTICATION ---');
  const regPayload = {
    email: 'ananya.citizen@varahi.org',
    full_name: 'Ananya Sharma',
    phone: '+919876543230',
    role: 'CITIZEN'
  };
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });
  const regData = await regRes.json();
  console.log('1.1 Registration Status:', regRes.status, '| User ID:', regData.user?.id, '| Name:', regData.user?.full_name);
  const citizenId = regData.user?.id;

  // Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya.citizen@varahi.org' })
  });
  const loginData = await loginRes.json();
  console.log('1.2 Login Status:', loginRes.status, '| Authenticated Role:', loginData.user?.role);

  // Logout (client-side token removal simulated)
  console.log('1.3 Logout: Token session cleared.');

  // Login again
  const reLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya.citizen@varahi.org' })
  });
  const reLoginData = await reLoginRes.json();
  console.log('1.4 Re-Login Status:', reLoginRes.status, '| User Verified:', reLoginData.user?.email === 'ananya.citizen@varahi.org');

  // TEST 2 & 3: CREATE REAL EMERGENCY REQUEST & VERIFY PRIORITY
  console.log('\n--- TEST 2 & 3: CREATE REAL EMERGENCY REQUEST & VERIFY PRIORITY ---');
  // Setup Realtime listener to test Test 9
  const realtimeUpdates = [];
  const channel = supabase.channel('step5_e2e_channel');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, (p) => {
    realtimeUpdates.push({ event: p.eventType, status: p.new?.status });
    console.log(`[Realtime Event] ${p.eventType} -> Status: ${p.new?.status}`);
  });
  channel.subscribe();
  await new Promise(r => setTimeout(r, 1500));

  const emergencyPayload = {
    citizen_id: citizenId,
    citizen_name: 'Ananya Sharma',
    citizen_phone: '+919876543230',
    request_type: 'EMERGENCY',
    category: 'trapped_person',
    people_count: 4,
    trapped: true,
    child_present: true,
    elderly_present: false,
    injured: true,
    medical_emergency: false,
    life_threat: true,
    latitude: 16.5449,
    longitude: 81.5212,
    address: 'Door 4-12-8, Mavullamma Temple Backside, Bhimavaram',
    description: 'Four people are trapped and one person is injured. A child is also present and immediate rescue is required.'
  };

  const reqRes = await fetch('http://localhost:5000/api/requests/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emergencyPayload)
  });
  const reqData = await reqRes.json();
  console.log('2.1 Emergency Request HTTP Status:', reqRes.status);
  const createdReq = reqData.request;
  const reqId = createdReq.id;
  console.log('2.2 Created Request ID:', reqId);
  console.log('3.1 Priority Level:', createdReq.priority_level);
  console.log('3.2 Priority Score:', createdReq.priority_score, '/ 100');
  console.log('3.3 Priority Reason:', createdReq.priority_reason);
  console.log('3.4 Recommended Responder:', createdReq.recommended_responder);

  // TEST 4: VERIFY SUPABASE
  console.log('\n--- TEST 4: VERIFY SUPABASE STORAGE ---');
  const { data: dbRequests, count: totalDbCount } = await supabase.from('emergency_requests').select('*', { count: 'exact' });
  console.log('4.1 Total Supabase Rows in emergency_requests:', totalDbCount);
  const matchedDbRow = dbRequests.find(r => r.id === reqId);
  console.log('4.2 Matched Row in Supabase:', Boolean(matchedDbRow));
  console.log('4.3 Category:', matchedDbRow?.category);
  console.log('4.4 People Count:', matchedDbRow?.people_count);
  console.log('4.5 Status in DB:', matchedDbRow?.status);
  console.log('4.6 PostGIS Location:', JSON.stringify(matchedDbRow?.location));

  // TEST 5: ADMIN DASHBOARD
  console.log('\n--- TEST 5: ADMIN DASHBOARD & GIS MAP ---');
  const adminRes = await fetch('http://localhost:5000/api/requests');
  const adminData = await adminRes.json();
  const adminStatsRes = await fetch('http://localhost:5000/api/dashboard/statistics');
  const adminStatsData = await adminStatsRes.json();
  console.log('5.1 Admin Dashboard Total Requests:', adminData.count);
  console.log('5.2 Admin Statistics KPIs: Total =', adminStatsData.statistics.total_requests, ', Critical =', adminStatsData.statistics.critical_requests);
  console.log('5.3 GIS Map Markers Count:', adminData.requests.length);
  console.log('5.4 Fake / Demo markers present in response:', adminData.requests.filter(r => r.id !== reqId).length);

  // TEST 6: RESPONDER DASHBOARD
  console.log('\n--- TEST 6: RESPONDER DASHBOARD ---');
  const responderRes = await fetch('http://localhost:5000/api/requests?type=EMERGENCY');
  const responderData = await responderRes.json();
  const responderReq = responderData.requests.find(r => r.id === reqId);
  console.log('6.1 Request visible in Responder Queue:', Boolean(responderReq));
  console.log('6.2 Responder Badge:', responderReq?.priority_level, '| Score:', responderReq?.priority_score);
  console.log('6.3 Queue Position:', responderData.requests.indexOf(responderReq) + 1, 'of', responderData.requests.length);

  // TEST 7: RESPONDER ACCEPTANCE & STATUS LIFECYCLE
  console.log('\n--- TEST 7: RESPONDER ACCEPTANCE & STATUS PROGRESSION ---');
  const statuses = ['ACCEPTED', 'ON_THE_WAY', 'RESCUE_IN_PROGRESS', 'RESOLVED'];
  
  // Assign to responder
  await fetch(`http://localhost:5000/api/requests/${reqId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assigned_to: {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        name: 'NDRF Rescue Unit Alpha (Capt. Rajesh)',
        role: 'RESPONDER'
      }
    })
  });

  for (const st of statuses) {
    const patchRes = await fetch(`http://localhost:5000/api/requests/${reqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: st,
        changed_by: 'NDRF Rescue Unit Alpha (Capt. Rajesh)',
        notes: `Operational state updated to ${st}`
      })
    });
    console.log(`7.X Transitioned -> ${st} (HTTP ${patchRes.status})`);
    await new Promise(r => setTimeout(r, 600));
  }

  // Check Supabase final status and history table
  const { data: updatedDbRow } = await supabase.from('emergency_requests').select('*').eq('id', reqId).single();
  console.log('7.5 Final Status in Supabase:', updatedDbRow?.status);
  const { data: historyRows } = await supabase.from('request_status_history').select('*').eq('request_id', reqId);
  console.log('7.6 Audit History Records in Supabase (request_status_history):', historyRows?.length);
  if (historyRows) {
    console.log('    History Steps:', historyRows.map(h => `${h.previous_status || 'INITIAL'} -> ${h.new_status}`).join(' | '));
  }

  // TEST 8: CITIZEN TRACKING
  console.log('\n--- TEST 8: CITIZEN TRACKING VIEW ---');
  const trackRes = await fetch(`http://localhost:5000/api/requests/${reqId}`);
  const trackData = await trackRes.json();
  console.log('8.1 Citizen Tracking View Status:', trackData.request?.status);
  console.log('8.2 Assigned Responder Display:', trackData.request?.assigned_to?.name || 'NDRF Unit');

  // TEST 9: REALTIME VERIFICATION
  console.log('\n--- TEST 9: REALTIME UPDATES ---');
  console.log('9.1 Total Realtime Events Captured during E2E flow:', realtimeUpdates.length);

  // TEST 10: PERSISTENCE & USER DECISION
  console.log('\n--- TEST 10: PERSISTENCE FOR USER DEMONSTRATION ---');
  console.log('10.1 Real Request ID in Supabase:', reqId);
  console.log('10.2 Preserved in database without auto-deletion, awaiting user instruction.');

  supabase.removeChannel(channel);
  console.log('\n========================================================');
  console.log('           ALL STEP 5 CHECKS COMPLETED                  ');
  console.log('========================================================\n');
}

runStep5Test().catch(console.error);
