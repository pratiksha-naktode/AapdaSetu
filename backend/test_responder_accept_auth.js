const BASE_URL = 'http://127.0.0.1:5000';

async function run() {
  const createRes = await fetch(`${BASE_URL}/api/requests/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      citizen_name: 'Acceptance Tester',
      citizen_phone: '+919000000001',
      category: 'flood',
      people_count: 2,
      trapped: true,
      child_present: false,
      elderly_present: false,
      injured: false,
      medical_emergency: false,
      life_threat: true,
      latitude: 16.54,
      longitude: 81.52,
      address: 'Test route acceptance lane'
    })
  });

  const createData = await createRes.json();
  const request = createData.request;
  const requestId = request.id;

  const assignedResponderId = request.assigned_to_user_id;
  if (!assignedResponderId) {
    throw new Error('Request was not auto-assigned to a responder.');
  }

  const wrongUserRes = await fetch(`${BASE_URL}/api/requests/${requestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'not-the-assigned-responder'
    },
    body: JSON.stringify({ status: 'ACCEPTED', changed_by: 'Wrong User' })
  });

  if (wrongUserRes.status !== 403) {
    const wrongBody = await wrongUserRes.text();
    throw new Error(`Expected 403 for non-assigned responder, received ${wrongUserRes.status}: ${wrongBody}`);
  }

  const correctUserRes = await fetch(`${BASE_URL}/api/requests/${requestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': assignedResponderId
    },
    body: JSON.stringify({ status: 'ACCEPTED', changed_by: 'Assigned Responder' })
  });

  const correctBody = await correctUserRes.json();
  if (!correctUserRes.ok) {
    throw new Error(`Assigned responder accepted request but API rejected it: ${correctBody.error || correctUserRes.status}`);
  }

  if (correctBody.request.status !== 'ACCEPTED') {
    throw new Error(`Expected ACCEPTED after correct responder accept, got ${correctBody.request.status}`);
  }

  console.log('PASS: responder acceptance auth is enforced and accepted status persists.');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
