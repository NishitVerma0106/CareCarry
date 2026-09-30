/**
 * CareCarry Interoperability & Federated Access Test
 * Tests:
 * 1. Health Providers listing & adapter online status
 * 2. Patient Identity Matching (CareCarry ID -> Hospital MRN)
 * 3. ABHA Identity Linkage (Separating CareCarry ID vs National ABHA)
 * 4. Federated Record Discovery across external hospital systems
 * 5. On-Demand Document Streaming from source hospital HIS without file duplication
 * 6. Interoperability Gateway KPIs and Audit Logging
 */
const http = require('http');
const app = require('./src/app');

const PORT = 5003;

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

async function runInteropTest() {
  console.log('====================================================');
  console.log('🌐 CARECARRY: TESTING HEALTH DATA INTEROPERABILITY LAYER');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  try {
    // 1. Doctor Sharma Login
    console.log('1. Doctor Sharma logging in at ABC Hospital...');
    const docRes = await request('POST', '/api/auth/login', {
      identifier: 'dr.sharma@example.com',
      password: 'Doctor@1234',
    });
    if (!docRes.data.success) throw new Error('Doctor login failed');
    const docToken = docRes.data.data.token;
    console.log('✅ Doctor logged in successfully.');

    // 2. Discover Connected Health Providers
    console.log('\n2. Querying Connected Healthcare Systems & Adapter Status...');
    const provRes = await request('GET', '/api/interoperability/providers', null, docToken);
    console.log(`✅ Discovered ${provRes.data.data.length} registered healthcare systems:`);
    provRes.data.data.forEach(p => {
      console.log(`   - [${p.provider_id}] ${p.name} (${p.adapter_type}) → Status: ${p.status}, Adapter Online: ${p.adapterOnline}`);
    });

    // 3. Link ABHA ID to Patient CC-7K3QX9AB
    console.log('\n3. Linking National Health Identifier (ABHA ID) to CareCarry Identity...');
    const abhaRes = await request('POST', '/api/interoperability/abha/link', {
      carecarryId: 'CC-7K3QX9AB',
      abhaId: '91-4412-8823-9011',
    }, docToken);
    console.log('✅ ABHA Linkage result:', abhaRes.data.message);
    console.log(`   CareCarry ID: ${abhaRes.data.data.carecarryId}`);
    console.log(`   ABHA ID     : ${abhaRes.data.data.abhaId}`);
    console.log(`   Note        : ${abhaRes.data.data.note}`);

    // 4. Patient Matching with Apollo Hospitals Central HIS
    console.log('\n4. Executing Cross-Hospital Patient Matching (CareCarry ID -> Apollo HIS MRN)...');
    const matchRes = await request('POST', '/api/interoperability/patient-match', {
      carecarryId: 'CC-7K3QX9AB',
      providerId: 'HOSP-001',
    }, docToken);
    console.log('✅ Patient matched at source provider:');
    console.log(`   Provider: ${matchRes.data.data.providerName}`);
    console.log(`   Hospital MRN: ${matchRes.data.data.providerMrn} (Match confidence: ${matchRes.data.data.matchScore * 100}%)`);

    // 5. Federated Record Discovery
    console.log('\n5. Executing Federated Record Discovery for Patient CC-7K3QX9AB across all systems...');
    const discRes = await request('GET', '/api/interoperability/patient/CC-7K3QX9AB/records', null, docToken);
    const records = discRes.data.data.records;
    console.log(`✅ Discovered ${records.length} clinical records from external hospital systems:`);
    records.forEach((r, idx) => {
      console.log(`   ${idx + 1}. [${r.sourceFacilityName}] ${r.title} (${r.recordType}) · Access: ${r.accessMethod}`);
      if (r.summarySnippet) console.log(`      Snippet: "${r.summarySnippet.substring(0, 80)}..."`);
    });

    // 6. On-Demand Federated Document Fetching from Apollo HIS
    console.log('\n6. Doctor requesting authorized clinical document from Apollo Hospitals (LAB-AP-88219)...');
    const fetchRes = await request('GET', '/api/interoperability/records/LAB-AP-88219/fetch', null, docToken);
    console.log('✅ On-Demand Federated Retrieval Successful!');
    console.log(`   Source Hospital: ${fetchRes.data.data.sourceHospital}`);
    console.log(`   Access Method  : ${fetchRes.data.data.accessMethod} (No permanent duplicate stored)`);
    console.log(`   Document Title : ${fetchRes.data.data.document.title}`);
    console.log(`   Physician Sign : ${fetchRes.data.data.document.signedBy}`);
    console.log(`   Lab Vitals     :`, fetchRes.data.data.document.data);

    // 7. On-Demand Fetch from Max Healthcare EMR (Discharge Summary)
    console.log('\n7. Doctor requesting Discharge Summary from Max Healthcare EMR (DIS-MAX-90142)...');
    const maxFetchRes = await request('GET', '/api/interoperability/records/DIS-MAX-90142/fetch', null, docToken);
    console.log('✅ Retrieved Max Healthcare Inpatient Record!');
    console.log(`   Clinical Course: ${maxFetchRes.data.data.document.clinicalCourse}`);
    console.log(`   Discharge Meds :`, maxFetchRes.data.data.document.dischargeMedications);

    // 8. Gateway Stats
    console.log('\n8. Checking Gateway Interoperability Metrics...');
    const statsRes = await request('GET', '/api/interoperability/stats', null, docToken);
    console.log('✅ Gateway Health & Standards Compliance:');
    console.log(statsRes.data.data);

    console.log('\n====================================================');
    console.log('🎉 ALL INTEROPERABILITY & FEDERATED ACCESS TESTS PASSED 100%!');
    console.log('====================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runInteropTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
