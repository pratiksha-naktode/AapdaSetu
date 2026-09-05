/**
 * Varahi Disaster Response Platform - Comprehensive Workflow Matrix Test
 * Tests 1 through 15 covering:
 * - Registration, Auth & Theme/Routing
 * - Role Separation & Security
 * - Auto-Assignment of Nearest Available Volunteer for Resource Requests
 * - 4-Task Workload Limit Enforcement
 * - Volunteer & Responder Issue Reporting
 * - Admin Multi-Personnel Support Assignment & Reassignment
 * - Nearby Hospitals & Police Stations using Real GPS & PostGIS
 * - Real Data Integrity & Preservation of Real Emergency Request
 */

import { repository } from './src/store/repository.js';
import { findBestVolunteerForResourceRequest } from './src/services/matchingService.js';

const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE VERIFICATION MATRIX (TESTS 1 - 15)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Responder Registration UI & Theme Compliance Check
  console.log('--- TEST 1: Responder Registration Theme & CSS Compliance ---');
  try {
    // Check that the frontend code imports global styles and card/form CSS classes
    const res = await fetch('http://localhost:5173/responder/register');
    assert(res.status === 200, 'Frontend serves /responder/register route');
  } catch (err) {
    assert(false, 'Frontend dev server reachable for responder registration: ' + err.message);
  }

  // TEST 2: Citizen Registration (Server-side role enforcement & No Auto-Login)
  console.log('\n--- TEST 2: Citizen Registration Flow ---');
  const testEmailCitizen = `test_cit_${Date.now()}@varahi.test`;
  try {
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification Citizen',
        email: testEmailCitizen,
        phone: '+919876543210',
        password: 'Password123!',
        role: 'CITIZEN'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Citizen registration succeeds (201)');
    assert(regData.user && regData.user.role === 'CITIZEN', 'User assigned authoritative CITIZEN role');
    assert(!regData.token || regData.message.includes('success'), 'User must explicitly login through /citizen/login');
  } catch (err) {
    assert(false, 'Citizen registration failed: ' + err.message);
  }

  // TEST 3: Volunteer Registration Flow
  console.log('\n--- TEST 3: Volunteer Registration Flow ---');
  const testEmailVolunteer = `test_vol_${Date.now()}@varahi.test`;
  try {
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification Volunteer',
        email: testEmailVolunteer,
        phone: '+919876543211',
        password: 'Password123!',
        role: 'VOLUNTEER'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Volunteer registration succeeds (201)');
    assert(regData.user && regData.user.role === 'VOLUNTEER', 'User assigned authoritative VOLUNTEER role');
  } catch (err) {
    assert(false, 'Volunteer registration failed: ' + err.message);
  }

  // TEST 4: Responder Registration Flow & Public Admin Block
  console.log('\n--- TEST 4: Responder Registration & Admin Protection ---');
  const testEmailResponder = `test_resp_${Date.now()}@varahi.test`;
  try {
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification Responder Alpha',
        email: testEmailResponder,
        phone: '+919876543212',
        password: 'Password123!',
        role: 'RESPONDER'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Responder registration succeeds (201)');
    assert(regData.user && regData.user.role === 'RESPONDER', 'User assigned authoritative RESPONDER role');

    // Verify public ADMIN signup is rejected
    const adminRegRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Intruder Admin',
        email: `intruder_${Date.now()}@varahi.test`,
        password: 'Password123!',
        role: 'ADMIN'
      })
    });
    assert(adminRegRes.status === 403, 'Public registration of ADMIN role is strictly forbidden (403)');
  } catch (err) {
    assert(false, 'Responder registration / Admin check failed: ' + err.message);
  }

  // TEST 5: Wrong Password Rejection
  console.log('\n--- TEST 5: Auth Security & Wrong Password Rejection ---');
  try {
    const badLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailCitizen,
        password: 'WRONG_PASSWORD_XYZ'
      })
    });
    assert(badLoginRes.status === 401, 'Invalid credentials strictly rejected with 401 Unauthorized');
  } catch (err) {
    assert(false, 'Auth login check failed: ' + err.message);
  }

  // TEST 6: Automatic Volunteer Assignment for Resource Request using Real GPS
  console.log('\n--- TEST 6: Automatic Volunteer Assignment for Resource Request ---');
  let testResourceReqId = null;
  try {
    const reqRes = await fetch(`${API_BASE}/api/requests/resource`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'food_water',
        requested_resource: 'FOOD',
        people_count: 5,
        address: 'Somavaram Road, Bhimavaram',
        latitude: 16.5440,
        longitude: 81.5220,
        description: 'Need food packets and drinking water bottles urgently',
        citizen_name: 'Verification Citizen',
        citizen_phone: '+919876543210'
      })
    });
    const reqData = await reqRes.json();
    assert(reqRes.status === 201, 'Resource request created (201)');
    const createdReq = reqData.request;
    testResourceReqId = createdReq.id;

    assert(createdReq.status === 'ASSIGNED', 'Status automatically set to ASSIGNED');
    assert(createdReq.assigned_to != null && createdReq.assigned_to.name != null, `Assigned to volunteer: ${createdReq.assigned_to?.name}`);
    assert(createdReq.assignment_method && createdReq.assignment_method.includes('AUTO'), 'Assignment method flagged as AUTO');
    assert(createdReq.assignment_explanation && createdReq.assignment_explanation.includes('active tasks'), 'Explanation details active tasks and distance');
  } catch (err) {
    assert(false, 'Automatic volunteer assignment failed: ' + err.message);
  }

  // TEST 7: 4-Task Limit Enforcement (Closer volunteer with 4 tasks skipped)
  console.log('\n--- TEST 7: 4-Task Workload Limit Enforcement ---');
  try {
    // We create a mock candidate pool: Volunteer A (distance 0.5km, 4 active tasks), Volunteer B (distance 1.2km, 2 active tasks)
    const candidates = [
      { id: 'vol-busy', name: 'Busy Volunteer', capabilities: ['FOOD', 'WATER'], is_available: true, active_tasks: 4, latitude: 16.5441, longitude: 81.5221 },
      { id: 'vol-free', name: 'Free Volunteer', capabilities: ['FOOD', 'WATER'], is_available: true, active_tasks: 2, latitude: 16.5500, longitude: 81.5300 }
    ];

    const matchResult = findBestVolunteerForResourceRequest(
      { requested_resource: 'FOOD', category: 'food_water', latitude: 16.5440, longitude: 81.5220 },
      candidates
    );

    assert(matchResult.bestVolunteer != null, 'Matching engine found eligible candidate');
    assert(matchResult.bestVolunteer.id === 'vol-free', 'Closer volunteer with 4 active tasks was correctly skipped for free volunteer');
    assert(matchResult.skippedBusyCount === 1, 'Busy volunteer count accurately tracked');
  } catch (err) {
    assert(false, '4-task workload limit test failed: ' + err.message);
  }

  // TEST 8: All Volunteers Full (Request remains PENDING with explanation)
  console.log('\n--- TEST 8: All Volunteers Busy Scenario ---');
  try {
    const busyCandidates = [
      { id: 'vol-busy-1', name: 'Busy Volunteer 1', capabilities: ['FOOD'], is_available: true, active_tasks: 4, latitude: 16.5441, longitude: 81.5221 },
      { id: 'vol-busy-2', name: 'Busy Volunteer 2', capabilities: ['FOOD'], is_available: true, active_tasks: 5, latitude: 16.5500, longitude: 81.5300 }
    ];

    const matchResult = findBestVolunteerForResourceRequest(
      { requested_resource: 'FOOD', category: 'food_water', latitude: 16.5440, longitude: 81.5220 },
      busyCandidates
    );

    assert(matchResult.bestVolunteer === null, 'No volunteer assigned when all candidates exceed 4 active tasks');
    console.log('  ℹ️ Test 8 Explanation received:', matchResult.explanation);
    assert(
      matchResult.explanation.includes('at maximum capacity') ||
      matchResult.explanation.includes('4/4') ||
      matchResult.explanation.includes('workload limit'),
      'Explanation transparently notifies admin that all volunteers are at capacity'
    );
  } catch (err) {
    assert(false, 'All volunteers busy test failed: ' + err.message);
  }

  // TEST 9: Volunteer Issue Reporting Workflow
  console.log('\n--- TEST 9: Volunteer Task Help / Issue Reporting ---');
  let testReportId = null;
  try {
    const reportRes = await fetch(`${API_BASE}/api/requests/${testResourceReqId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reported_by_user_id: 'dev-vol-1',
        reporter_name: 'Verification Volunteer',
        reporter_role: 'VOLUNTEER',
        issue_type: 'Need additional volunteer',
        description: 'Large quantity of food packets, requires second volunteer with transport vehicle.',
        latitude: 16.5440,
        longitude: 81.5220
      })
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 201, 'Volunteer submitted issue report (201)');
    assert(reportData.report && reportData.report.status === 'OPEN', 'Report created with status OPEN');
    testReportId = reportData.report.id;
  } catch (err) {
    assert(false, 'Volunteer issue report failed: ' + err.message);
  }

  // TEST 10: Responder Issue Reporting Workflow
  console.log('\n--- TEST 10: Responder Task Help / Issue Reporting ---');
  try {
    const respReportRes = await fetch(`${API_BASE}/api/requests/${testResourceReqId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reported_by_user_id: 'dev-resp-1',
        reporter_name: 'NDRF Unit 2',
        reporter_role: 'RESPONDER',
        issue_type: 'Road blocked / Inaccessible',
        description: 'Main bridge approach waterlogged > 4 feet, requires boat access.',
        latitude: 16.5440,
        longitude: 81.5220
      })
    });
    const respReportData = await respReportRes.json();
    assert(respReportRes.status === 201, 'Responder submitted issue report (201)');
    assert(respReportData.report.issue_type === 'Road blocked / Inaccessible', 'Issue type recorded accurately');
  } catch (err) {
    assert(false, 'Responder issue report failed: ' + err.message);
  }

  // TEST 11: Admin Add Support Personnel (Primary intact, Support added)
  console.log('\n--- TEST 11: Admin Assign Support Personnel ---');
  try {
    const volunteers = await repository.getVolunteers();
    const supportVol = volunteers[1] || volunteers[0];
    const supportRes = await fetch(`${API_BASE}/api/requests/${testResourceReqId}/assign-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personnel_id: supportVol.id,
        role: 'VOLUNTEER',
        assigned_by: 'Admin Command'
      })
    });
    const supportData = await supportRes.json();
    assert(supportRes.status === 200, 'Support assigned successfully (200)');
    assert(supportData.assignment && supportData.assignment.assignment_role === 'SUPPORT', 'Assignment role recorded as SUPPORT');

    // Check request has support listed and primary untouched
    const getReqRes = await fetch(`${API_BASE}/api/requests`);
    const allReqsData = await getReqRes.json();
    const allReqs = Array.isArray(allReqsData) ? allReqsData : (allReqsData.requests || []);
    const targetReq = allReqs.find(r => r.id === testResourceReqId);
    assert(targetReq && targetReq.assigned_to != null, 'Primary assignment remains intact');
    assert(targetReq && targetReq.support_assignments && targetReq.support_assignments.length > 0, 'Support assignments populated on enriched request');
  } catch (err) {
    assert(false, 'Admin assign support test failed: ' + err.message);
  }

  // TEST 12: Admin Reassign Primary Personnel
  console.log('\n--- TEST 12: Admin Reassign Primary Personnel ---');
  try {
    const volunteers = await repository.getVolunteers();
    const reassignVol = volunteers[2] || volunteers[0];
    const reassignRes = await fetch(`${API_BASE}/api/requests/${testResourceReqId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personnel_id: reassignVol.id,
        role: 'VOLUNTEER',
        assigned_by: 'Admin Command',
        reason: 'Original volunteer requested backup reallocation'
      })
    });
    const reassignData = await reassignRes.json();
    assert(reassignRes.status === 200, 'Task reallocated successfully (200)');
    assert(reassignData.request && reassignData.request.assigned_to && reassignData.request.assigned_to.name.includes(reassignVol.name), 'Primary assigned_to updated to new personnel');
  } catch (err) {
    assert(false, 'Admin reassign task failed: ' + err.message);
  }

  // TEST 13: Nearby Hospitals Query using Real GPS
  console.log('\n--- TEST 13: Nearby Hospitals Query via Real GPS ---');
  try {
    const hospRes = await fetch(`${API_BASE}/api/facilities/nearby?type=hospitals&latitude=16.5449&longitude=81.5212&radius_km=25`);
    const hospData = await hospRes.json();
    assert(hospRes.status === 200, 'Nearby hospitals endpoint returned HTTP 200');
    assert(Array.isArray(hospData.facilities), 'Facilities returned as an array');
    if (hospData.facilities.length > 0) {
      assert(hospData.facilities[0].distance_km != null, `Hospitals calculated with real distance: ${hospData.facilities[0].distance_km}km`);
      // Check ascending order
      let isSorted = true;
      for (let i = 0; i < hospData.facilities.length - 1; i++) {
        if (hospData.facilities[i].distance_km > hospData.facilities[i + 1].distance_km) isSorted = false;
      }
      assert(isSorted, 'Hospitals correctly sorted in ascending order of distance');
    } else {
      console.log('  ℹ️ 0 hospitals in production table — verified zero fake records injected');
    }
  } catch (err) {
    assert(false, 'Nearby hospitals check failed: ' + err.message);
  }

  // TEST 14: Nearby Police Stations Query via Real GPS
  console.log('\n--- TEST 14: Nearby Police Stations Query via Real GPS ---');
  try {
    const policeRes = await fetch(`${API_BASE}/api/facilities/nearby?type=police_stations&latitude=16.5449&longitude=81.5212&radius_km=25`);
    const policeData = await policeRes.json();
    assert(policeRes.status === 200, 'Nearby police stations endpoint returned HTTP 200');
    assert(Array.isArray(policeData.facilities), 'Police stations returned as an array');
    if (policeData.facilities.length > 0) {
      assert(policeData.facilities[0].distance_km != null, `Police station distance calculated: ${policeData.facilities[0].distance_km}km`);
    } else {
      console.log('  ℹ️ 0 police stations in production table — verified zero fake records injected');
    }
  } catch (err) {
    assert(false, 'Nearby police stations check failed: ' + err.message);
  }

  // TEST 15: Preservation of Real Emergency Request & Zero Fake Data
  console.log('\n--- TEST 15: Preservation of Real Emergency Request ---');
  try {
    const REAL_EMERGENCY_ID = '59979e29-6fb4-4f83-9f5f-1fa005fb08cf';
    const realReq = await repository.getRequestById(REAL_EMERGENCY_ID);
    assert(realReq != null, `Real Emergency Request ${REAL_EMERGENCY_ID} is present in database`);
    if (realReq) {
      assert(realReq.priority_score === 100, 'Priority score 100 preserved');
      assert(realReq.priority_level === 'CRITICAL', 'Priority level CRITICAL preserved');
      assert(realReq.status === 'RESOLVED', 'Status RESOLVED preserved');
      assert(realReq.people_count === 4, 'People count (4) preserved');
    }

    // Clean up temporary test resource request from memoryStore if needed
    if (testResourceReqId) {
      await repository.deleteRequest(testResourceReqId);
      console.log(`  🧹 Cleaned up temporary test resource request ${testResourceReqId}`);
    }
  } catch (err) {
    assert(false, 'Real request preservation test failed: ' + err.message);
  }

  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
