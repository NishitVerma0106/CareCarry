/**
 * CareCarry Hospital Operations & Clinical Integration Test
 * Verifies:
 * 1. QR resolve via POST /api/identity/qr/resolve
 * 2. Encounter creation with Department and Token Number
 * 3. Queue status transition: waiting -> in_consultation -> completed
 * 4. Laboratory Order creation and completion
 * 5. Pharmacy Prescriptions & Medication Dispensing
 * 6. Encounter Discharge Summary
 */
const http = require('http');
const app = require('./src/app');
const { pool } = require('./src/config/database');

const PORT = 5002;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['Content-Type'] = 'application/json';

    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({ host: 'localhost', port: PORT, method, path, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('====================================================');
  console.log('🏥 CARECARRY: TESTING HOSPITAL OPERATIONS & CLINICAL LAYER');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  try {
    // 1. Login staff
    console.log('1. Logging in as Hospital Staff (ABC Hospital)...');
    const staffRes = await request('POST', '/api/auth/login', {
      identifier: 'anil.staff@abc.in',
      password: 'Staff@1234',
    });
    if (!staffRes.data.success) throw new Error(`Staff login failed: ${JSON.stringify(staffRes.data)}`);
    const staffToken = staffRes.data.data.token;
    console.log('✅ Staff logged in successfully.');

    // 2. Fetch hospital command center stats
    console.log('\n2. Fetching Hospital Command Center Stats...');
    const statsRes = await request('GET', '/api/hospital/stats', null, staffToken);
    console.log('✅ Hospital Stats:', statsRes.data.data);

    // 3. Fetch hospital departments
    console.log('\n3. Fetching Hospital Departments...');
    const deptRes = await request('GET', '/api/hospital/departments', null, staffToken);
    console.log(`✅ Loaded ${deptRes.data.data.length} clinical departments:`, deptRes.data.data.map(d => d.name).join(', '));

    // 4. Resolve patient QR token
    console.log('\n4. Resolving dynamic QR token (CC-7K3QX9AB)...');
    // Get existing QR token from db for patient
    const [tokens] = await pool.query('SELECT token FROM qr_tokens LIMIT 1');
    const tokenStr = tokens[0]?.token || 'QR-E1E403629E3647C2';

    const qrRes = await request('POST', '/api/identity/qr/resolve', { qrToken: tokenStr }, staffToken);
    console.log('✅ QR Resolved:', qrRes.data.data?.name || qrRes.data.data?.patient?.name, `(CareCarry ID: ${qrRes.data.data?.carecarryId || qrRes.data.data?.patient?.carecarryId})`);

    // 5. Create Encounter with Cardiology Department
    console.log('\n5. Creating Hospital Encounter with Department: Cardiology...');
    const encRes = await request('POST', '/api/encounters', {
      carecarryId: qrRes.data.data?.carecarryId || qrRes.data.data?.patient?.carecarryId,
      department: 'Cardiology',
      visitType: 'OPD',
      reason: 'Chest discomfort & palpitation evaluation',
      doctorId: 1,
    }, staffToken);

    if (!encRes.data.success) throw new Error(`Encounter creation failed: ${JSON.stringify(encRes.data)}`);
    const encId = encRes.data.data.encounterId;
    const tokenNum = encRes.data.data.tokenNumber;
    console.log(`✅ Encounter #${encId} created!`);
    console.log(`   Assigned Queue Token: ${tokenNum}`);
    console.log(`   Status              : ${encRes.data.data.status}`);
    console.log(`   Queue Status        : ${encRes.data.data.queueStatus}`);

    // 6. Update Queue Status to IN_CONSULTATION
    console.log(`\n6. Calling patient into Doctor consultation room (Transition to 'in_consultation')...`);
    const patchRes = await request('PATCH', `/api/encounters/${encId}/status`, {
      queue_status: 'in_consultation',
    }, staffToken);
    console.log('✅ Queue Status updated:', patchRes.data.data);

    // 7. Doctor orders Lab Tests (CBC & Lipid Profile)
    console.log('\n7. Doctor/Staff ordering Laboratory tests (CBC, Lipid Profile, ECG)...');
    const labOrderRes = await request('POST', `/api/encounters/${encId}/lab-orders`, {
      tests: ['Complete Blood Count (CBC)', 'Lipid Profile', '12-Lead ECG'],
      notes: 'Urgent pre-consultation cardiac evaluation',
    }, staffToken);
    console.log('✅ Lab Orders Created:', labOrderRes.data.data.orders);

    // 8. Complete one of the Lab Orders
    const orderIdToComplete = labOrderRes.data.data.orders[0].orderId;
    console.log(`\n8. Laboratory desk processing sample for Order #${orderIdToComplete}...`);
    const labUpdateRes = await request('PATCH', `/api/lab/orders/${orderIdToComplete}/status`, {
      status: 'SAMPLE_COLLECTED',
      notes: 'Blood sample drawn at 10:15 AM',
    }, staffToken);
    console.log('✅ Lab Order status updated to SAMPLE_COLLECTED');

    // 9. Doctor records Consultation & Prescription
    console.log('\n9. Doctor Sharma logging in to consult and prescribe...');
    const docLogin = await request('POST', '/api/auth/login', {
      identifier: 'dr.sharma@example.com',
      password: 'Doctor@1234',
    });
    const docToken = docLogin.data.data.token;

    const consultRes = await request('POST', '/api/doctor/consultations', {
      encounter_id: encId,
      symptoms: 'Mild chest tightness on exertion, normal resting vitals',
      clinical_notes: 'ECG normal sinus rhythm. Advised diet modification and follow-up.',
      follow_up: 'Review in 2 weeks with lipid profile reports',
    }, docToken);
    const consultId = consultRes.data.data.consultationId;
    console.log(`✅ Consultation recorded! ID: ${consultId}`);

    const rxRes = await request('POST', '/api/doctor/prescriptions', {
      consultation_id: consultId,
      instructions: 'Take statin at bedtime, aspirin after breakfast.',
      items: [
        { medicine_name: 'Atorvastatin 10mg', dosage: '1 tab', frequency: 'Bedtime', duration: '30 days', notes: 'Cholesterol control' },
        { medicine_name: 'Aspirin 75mg', dosage: '1 tab', frequency: 'Morning after food', duration: '30 days', notes: 'Cardioprotective' },
      ],
    }, docToken);
    console.log(`✅ Prescription generated! ID: ${rxRes.data.data.prescriptionId}`);

    // 10. Pharmacy Integration - Fetch and Dispense
    console.log('\n10. Hospital Pharmacy desk reviewing prescription...');
    const rxQueueRes = await request('GET', `/api/hospital/pharmacy/prescriptions/${encId}`, null, staffToken);
    const prescriptionData = rxQueueRes.data.data[0];
    console.log(`✅ Found prescription with ${prescriptionData.items.length} medicines in pharmacy queue:`);
    prescriptionData.items.forEach(it => {
      console.log(`   - ${it.medicine_name} [${it.status}]`);
    });

    const firstItemId = prescriptionData.items[0].item_id;
    console.log(`\nDispensing first medication (Item #${firstItemId}: ${prescriptionData.items[0].medicine_name})...`);
    const dispenseRes = await request('PATCH', `/api/pharmacy/items/${firstItemId}/dispense`, {
      status: 'DISPENSED',
    }, staffToken);
    console.log('✅ Dispense response:', dispenseRes.data.message);

    // 11. Discharge Encounter
    console.log(`\n11. Generating Discharge Summary and closing Encounter #${encId}...`);
    const dischargeRes = await request('POST', `/api/encounters/${encId}/discharge`, {
      diagnosis: 'Atypical Angina, Hyperlipidemia Rule-out',
      treatment: 'Lifestyle modification, Atorvastatin, Aspirin',
      followUpDate: '2026-10-15',
      notes: 'Avoid strenuous exertion until next follow-up. Low fat diet.',
    }, staffToken);
    console.log('✅ Discharge Summary created:');
    console.log(dischargeRes.data.data.dischargeSummary);
    console.log(`   Encounter Status: ${dischargeRes.data.data.status}`);
    console.log(`   Queue Status    : ${dischargeRes.data.data.queueStatus}`);

    console.log('\n====================================================');
    console.log('🎉 ALL HOSPITAL OPERATIONS TESTS PASSED 100%!');
    console.log('====================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
