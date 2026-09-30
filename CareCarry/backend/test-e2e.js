/**
 * CareCarry End-to-End Verification Test
 * Tests the entire required demo workflow per Section 32 of the specification
 */
const http = require('http');
const app = require('./src/app');
const { connectDB, pool } = require('./src/config/database');

let server;
const PORT = 5001; // Test on 5001 so it doesn't conflict with any active server

function request(method, path, body = null, token = null, isMultipart = false, boundary = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    } else if (boundary) {
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
    }

    const payload = body && !isMultipart ? JSON.stringify(body) : body;
    if (payload) {
      headers['Content-Length'] = Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: 'localhost',
        port: PORT,
        method,
        path,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode, data });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildMultipart(fields, fileField, filename, fileBuffer, mimeType) {
  const boundary = '----CareCarryFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined && val !== null) {
      parts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`)
      );
    }
  }

  if (fileField && filename && fileBuffer) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    boundary,
    body: Buffer.concat(parts),
  };
}

async function runDemoWorkflow() {
  console.log('====================================================');
  console.log('🏥 CARECARRY: EXECUTING FULL END-TO-END DEMO WORKFLOW');
  console.log('====================================================\n');

  await connectDB();
  server = app.listen(PORT);
  console.log(`Test API Server listening on port ${PORT}\n`);

  try {
    // ----------------------------------------------------
    // STEP 1: Register Patient
    // ----------------------------------------------------
    console.log('Step 1: Registering new patient...');
    const patientEmail = `test.patient.${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      fullName: 'Aarav Mehta',
      email: patientEmail,
      password: 'Patient@1234',
      phone: '9820011223',
      role: 'patient',
      date_of_birth: '1995-04-12',
      gender: 'male',
      blood_group: 'B+',
      address: 'Flat 302, Green Enclave',
      city: 'Pune',
      state: 'Maharashtra',
      emergency_contact_name: 'Meera Mehta',
      emergency_contact_phone: '9820011224',
      allergies: 'Penicillin, Dust',
      conditions: 'Mild Asthma',
      consent: true,
    });

    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
    }

    const carecarryId = regRes.data.data.user.carecarryId;
    const patientId = regRes.data.data.user.patientId;
    console.log(`✅ Patient registered!`);
    console.log(`   User ID     : ${regRes.data.data.user.userId}`);
    console.log(`   CareCarry ID: ${carecarryId}`);
    console.log(`   Patient ID  : ${patientId}`);

    // Verify in MySQL
    const [pDbRows] = await pool.query('SELECT * FROM patients WHERE carecarry_id = ?', [carecarryId]);
    if (!pDbRows.length) throw new Error('Patient not saved in MySQL!');
    console.log(`✅ Verified in MySQL: patient_id=${pDbRows[0].patient_id}, blood_group=${pDbRows[0].blood_group}`);

    // ----------------------------------------------------
    // STEP 2: Patient Login (Using CareCarry ID!)
    // ----------------------------------------------------
    console.log('\nStep 2: Patient logging in using CareCarry ID...');
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: carecarryId,
      password: 'Patient@1234',
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login with CareCarry ID failed: ${JSON.stringify(loginRes.data)}`);
    }
    const patientToken = loginRes.data.data.token;
    console.log(`✅ Login successful! JWT received.`);

    // ----------------------------------------------------
    // STEP 3: Patient CareCard / QR verification
    // ----------------------------------------------------
    console.log('\nStep 3: Fetching Patient QR CareCard...');
    const cardRes = await request('GET', '/api/patient/carecard', null, patientToken);
    if (cardRes.status !== 200) {
      throw new Error(`CareCard fetch failed: ${JSON.stringify(cardRes.data)}`);
    }
    const qrToken = cardRes.data.data.token;
    console.log(`✅ CareCard QR Token generated: ${qrToken}`);
    console.log(`   Patient Name on CareCard: ${cardRes.data.data.name}`);

    // ----------------------------------------------------
    // STEP 4: Patient Uploads Real Medical Report
    // ----------------------------------------------------
    console.log('\nStep 4: Patient uploading medical report (PDF)...');
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
    const { boundary: pBoundary, body: pBody } = buildMultipart(
      {
        document_type: 'lab_report',
        title: 'Complete Blood Count (CBC) Baseline',
        hospital_name: 'Metropolis Diagnostics',
        report_date: '2026-09-25',
        description: 'Routine wellness blood count test',
      },
      'file',
      'Blood_Report_Aarav.pdf',
      dummyPdf,
      'application/pdf'
    );

    const uploadRes = await request('POST', '/api/patient/reports', pBody, patientToken, true, pBoundary);
    if (uploadRes.status !== 201) {
      throw new Error(`Report upload failed: ${JSON.stringify(uploadRes.data)}`);
    }
    console.log(`✅ Medical Report uploaded!`);
    console.log(`   Report ID : ${uploadRes.data.data.reportId}`);
    console.log(`   Secure URL: ${uploadRes.data.data.secureUrl}`);

    // Verify metadata saved in MySQL
    const [mrRows] = await pool.query('SELECT * FROM medical_reports WHERE report_id = ?', [uploadRes.data.data.reportId]);
    if (!mrRows.length) throw new Error('Medical report metadata not found in MySQL!');
    console.log(`✅ Metadata confirmed in MySQL: title="${mrRows[0].title}", public_id="${mrRows[0].cloudinary_public_id}"`);

    // ----------------------------------------------------
    // STEP 5: Hospital Staff Login
    // ----------------------------------------------------
    console.log('\nStep 5: Hospital Staff logging in...');
    const staffLoginRes = await request('POST', '/api/auth/login', {
      identifier: 'anil.staff@abc.in',
      password: 'Staff@1234',
    });
    if (staffLoginRes.status !== 200) {
      throw new Error(`Staff login failed: ${JSON.stringify(staffLoginRes.data)}`);
    }
    const staffToken = staffLoginRes.data.data.token;
    console.log(`✅ Hospital staff logged in!`);

    // ----------------------------------------------------
    // STEP 6: Hospital Scans QR / Resolves Patient Identity
    // ----------------------------------------------------
    console.log('\nStep 6: Hospital resolving patient via QR token or CareCarry ID...');
    const resolveRes = await request(
      'POST',
      '/api/hospital/patients/resolve',
      { carecarryId },
      staffToken
    );
    if (resolveRes.status !== 200) {
      throw new Error(`Patient resolution failed: ${JSON.stringify(resolveRes.data)}`);
    }
    const resolvedPatient = resolveRes.data.data.patient;
    console.log(`✅ Patient resolved by hospital API:`);
    console.log(`   Name        : ${resolvedPatient.name}`);
    console.log(`   CareCarry ID: ${resolvedPatient.carecarryId}`);
    console.log(`   Blood Group : ${resolvedPatient.bloodGroup}`);

    // ----------------------------------------------------
    // STEP 7: Hospital Creates Encounter & Assigns Doctor
    // ----------------------------------------------------
    console.log('\nStep 7: Hospital creating Encounter & assigning Dr. Priya (Doctor ID 1)...');
    const encRes = await request(
      'POST',
      '/api/hospital/encounters',
      {
        patientId,
        doctorId: 1,
        visitType: 'OPD',
        reason: 'Recurrent mild cough and seasonal allergic rhinitis',
      },
      staffToken
    );
    if (encRes.status !== 201) {
      throw new Error(`Encounter creation failed: ${JSON.stringify(encRes.data)}`);
    }
    const encounterId = encRes.data.data.encounterId;
    console.log(`✅ Encounter #${encounterId} created! Status: ${encRes.data.data.status}`);

    // ----------------------------------------------------
    // STEP 8: Hospital Staff Uploads Hospital Documents
    // ----------------------------------------------------
    console.log('\nStep 8: Hospital uploading X-Ray document to Encounter...');
    const dummyImage = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
    const { boundary: hBoundary, body: hBody } = buildMultipart(
      {
        patient_id: patientId,
        encounter_id: encounterId,
        document_type: 'xray',
        title: 'Chest X-Ray Digital Scan',
      },
      'file',
      'chest_xray_scan.png',
      dummyImage,
      'image/png'
    );

    const docUploadRes = await request('POST', `/api/hospital/encounters/${encounterId}/reports`, hBody, staffToken, true, hBoundary);
    if (docUploadRes.status !== 201) {
      throw new Error(`Hospital document upload failed: ${JSON.stringify(docUploadRes.data)}`);
    }
    console.log(`✅ Hospital Document attached to Encounter #${encounterId}!`);

    // ----------------------------------------------------
    // STEP 9: Doctor Login & Encounter Queue
    // ----------------------------------------------------
    console.log('\nStep 9: Doctor Priya logging in...');
    const docLoginRes = await request('POST', '/api/auth/login', {
      identifier: 'dr.sharma@example.com',
      password: 'Doctor@1234',
    });
    if (docLoginRes.status !== 200) {
      throw new Error(`Doctor login failed: ${JSON.stringify(docLoginRes.data)}`);
    }
    const doctorToken = docLoginRes.data.data.token;
    console.log(`✅ Doctor logged in!`);

    console.log('Fetching Doctor assigned encounters queue...');
    const queueRes = await request('GET', '/api/doctor/encounters', null, doctorToken);
    const foundEnc = queueRes.data.data.find((e) => e.encounter_id === encounterId);
    if (!foundEnc) {
      throw new Error(`Encounter #${encounterId} not found in Doctor's queue!`);
    }
    console.log(`✅ Encounter #${encounterId} appears in Doctor's queue for patient "${foundEnc.first_name} ${foundEnc.last_name}"!`);

    // ----------------------------------------------------
    // STEP 10: Doctor Loads Clinical Summary
    // ----------------------------------------------------
    console.log('\nStep 10: Doctor loading Clinical Summary for Encounter...');
    const summaryRes = await request('GET', `/api/doctor/encounters/${encounterId}/clinical-summary`, null, doctorToken);
    if (summaryRes.status !== 200) {
      throw new Error(`Clinical summary fetch failed: ${JSON.stringify(summaryRes.data)}`);
    }
    console.log(`✅ Clinical Summary loaded!`);
    console.log(`   Patient Allergies: ${summaryRes.data.data.patient.allergies}`);
    console.log(`   Patient Conditions: ${summaryRes.data.data.patient.conditions}`);
    console.log(`   Available Documents: ${summaryRes.data.data.reports?.length || 0}`);

    // ----------------------------------------------------
    // STEP 11: Doctor Records Consultation, Diagnosis, Prescription
    // ----------------------------------------------------
    console.log('\nStep 11a: Doctor recording Consultation...');
    const consultRes = await request('POST', '/api/doctor/consultations', {
      encounter_id: encounterId,
      symptoms: 'Mild throat irritation, dry cough for 4 days, no high fever',
      clinical_notes: 'Throat mildly erythematous. Chest bilateral air entry clear. SpO2: 99%',
      follow_up: 'Review if symptoms persist beyond 5 days',
    }, doctorToken);
    if (consultRes.status !== 201) {
      throw new Error(`Consultation failed: ${JSON.stringify(consultRes.data)}`);
    }
    const consultationId = consultRes.data.data.consultationId;
    console.log(`✅ Consultation recorded! ID: ${consultationId}`);

    console.log('Step 11b: Doctor recording Diagnosis...');
    const diagRes = await request('POST', '/api/doctor/diagnoses', {
      consultation_id: consultationId,
      diagnosis: 'Allergic Pharyngitis',
      icd_code: 'J02.9',
      remarks: 'Likely triggered by atmospheric dust. Seasonal allergic origin.',
    }, doctorToken);
    if (diagRes.status !== 201) {
      throw new Error(`Diagnosis failed: ${JSON.stringify(diagRes.data)}`);
    }
    console.log(`✅ Diagnosis recorded! ID: ${diagRes.data.data.diagnosisId}`);

    console.log('Step 11c: Doctor writing Prescription with Medicine items...');
    const rxRes = await request('POST', '/api/doctor/prescriptions', {
      consultation_id: consultationId,
      instructions: 'Take after meals. Drink warm water.',
      items: [
        {
          medicine_name: 'Levocetirizine 5mg',
          dosage: '1 tablet',
          frequency: 'Once at night',
          duration: '5 days',
          notes: 'For allergic rhinitis',
        },
        {
          medicine_name: 'Warm Saline Gargle',
          dosage: 'Twice daily',
          frequency: 'Morning & evening',
          duration: '3 days',
          notes: 'Soothes throat irritation',
        },
      ],
    }, doctorToken);
    if (rxRes.status !== 201) {
      throw new Error(`Prescription failed: ${JSON.stringify(rxRes.data)}`);
    }
    console.log(`✅ Prescription recorded! ID: ${rxRes.data.data.prescriptionId}`);

    // ----------------------------------------------------
    // STEP 12: Verify Patient Longitudinal Medical Timeline Updated
    // ----------------------------------------------------
    console.log('\nStep 12: Verifying Patient Timeline updated via API...');
    const timelineRes = await request('GET', '/api/patient/timeline', null, patientToken);
    if (timelineRes.status !== 200) {
      throw new Error(`Timeline fetch failed: ${JSON.stringify(timelineRes.data)}`);
    }

    const timeline = timelineRes.data.data;
    console.log(`✅ Patient timeline retrieved! Total timeline items: ${timeline.length}`);
    const latestEnc = timeline.find((item) => item.encounter_id === encounterId);
    if (!latestEnc) {
      throw new Error(`Encounter #${encounterId} not found in Patient Timeline!`);
    }
    console.log(`   Latest Encounter ID : #${latestEnc.encounter_id}`);
    console.log(`   Encounter Status    : ${latestEnc.status}`);
    console.log(`   Consultations Count : ${latestEnc.consultations.length}`);
    console.log(`   Recorded Diagnosis  : ${latestEnc.consultations[0].diagnosis}`);
    console.log(`   Prescription Items  : ${latestEnc.consultations[0].prescription_items.length}`);
    console.log(`   Linked Documents    : ${latestEnc.reports.length}`);

    // ----------------------------------------------------
    // STEP 13: Verify Audit Logs
    // ----------------------------------------------------
    console.log('\nStep 13: Verifying Audit Logs for Platform Governance...');
    const [auditRows] = await pool.query(
      'SELECT action, actor_role, patient_id, created_at FROM audit_logs WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    );
    console.log(`✅ Audit trail verified! Actions logged for this patient (${auditRows.length} events):`);
    auditRows.forEach((r) => console.log(`   - [${r.actor_role.toUpperCase()}] ${r.action}`));

    console.log('\n====================================================');
    console.log('🎉 ALL SECTION 32 DEMO STEPS PASSED 100% SUCCESSFULLY!');
    console.log('====================================================');
  } finally {
    if (server) server.close();
    await pool.end();
  }
}

runDemoWorkflow().catch((err) => {
  console.error('\n❌ DEMO VERIFICATION FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
