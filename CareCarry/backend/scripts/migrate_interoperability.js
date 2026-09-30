const { pool } = require('../src/config/database');

async function migrateInteroperability() {
  const conn = await pool.getConnection();
  try {
    console.log('Running Interoperability Gateway & Federated Access migration...');

    // 1. Add ABHA columns to patients
    const [pcols] = await conn.query('SHOW COLUMNS FROM patients');
    const pColNames = pcols.map(c => c.Field);

    if (!pColNames.includes('abha_id')) {
      await conn.query("ALTER TABLE patients ADD COLUMN abha_id VARCHAR(30) DEFAULT NULL AFTER carecarry_id");
      console.log('✅ Added abha_id to patients table');
    }
    if (!pColNames.includes('abha_status')) {
      await conn.query("ALTER TABLE patients ADD COLUMN abha_status ENUM('UNLINKED', 'LINKED', 'VERIFIED') DEFAULT 'UNLINKED' AFTER abha_id");
      console.log('✅ Added abha_status to patients table');
    }

    // 2. Create health_providers table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS health_providers (
        provider_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider_code VARCHAR(50) UNIQUE NOT NULL,
        facility_type ENUM('HOSPITAL_HIS', 'DIAGNOSTIC_LAB', 'CLINIC_EMR', 'GOVERNMENT_NETWORK') DEFAULT 'HOSPITAL_HIS',
        endpoint_url VARCHAR(255) NOT NULL,
        adapter_type VARCHAR(50) DEFAULT 'REST_ADAPTER',
        status ENUM('ACTIVE', 'MAINTENANCE', 'DEPRECATED') DEFAULT 'ACTIVE',
        records_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Verified health_providers table');

    // 3. Create provider_patient_mappings table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS provider_patient_mappings (
        mapping_id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        carecarry_id VARCHAR(20) NOT NULL,
        provider_id VARCHAR(50) NOT NULL,
        provider_mrn VARCHAR(100) NOT NULL,
        match_status ENUM('MATCHED', 'PENDING_CONSENT', 'REJECTED') DEFAULT 'MATCHED',
        matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES health_providers(provider_id) ON DELETE CASCADE,
        UNIQUE KEY uq_provider_mrn (provider_id, provider_mrn),
        UNIQUE KEY uq_patient_provider (patient_id, provider_id),
        INDEX idx_carecarry (carecarry_id)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Verified provider_patient_mappings table');

    // 4. Create federated_record_references table (metadata only, actual document lives in source HIS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS federated_record_references (
        record_id VARCHAR(50) PRIMARY KEY,
        patient_id INT NOT NULL,
        carecarry_id VARCHAR(20) NOT NULL,
        provider_id VARCHAR(50) NOT NULL,
        record_type ENUM('LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'IMAGING_STUDY', 'CLINICAL_NOTE') NOT NULL,
        title VARCHAR(255) NOT NULL,
        encounter_ref VARCHAR(50) DEFAULT NULL,
        source_record_id VARCHAR(100) NOT NULL,
        source_facility_name VARCHAR(255) NOT NULL,
        source_doctor_name VARCHAR(255) DEFAULT NULL,
        source_created_at DATETIME NOT NULL,
        access_method ENUM('FEDERATED_API', 'FHIR_R4', 'CLOUD_FALLBACK') DEFAULT 'FEDERATED_API',
        mime_type VARCHAR(100) DEFAULT 'application/pdf',
        summary_snippet TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES health_providers(provider_id) ON DELETE CASCADE,
        INDEX idx_pat_records (patient_id),
        INDEX idx_cc_records (carecarry_id),
        INDEX idx_provider (provider_id)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Verified federated_record_references table');

    // 5. Seed default participating health providers
    const providers = [
      ['HOSP-001', 'Apollo Hospitals Central HIS', 'APOLLO_HIS', 'HOSPITAL_HIS', 'https://his-api.apollo.org/v2/interop', 'MOCK_HIS_ADAPTER', 'ACTIVE', 1420],
      ['HOSP-002', 'Max Super Specialty EMR Network', 'MAX_EMR', 'HOSPITAL_HIS', 'https://emr.maxhealthcare.in/fhir/r4', 'MOCK_HIS_ADAPTER', 'ACTIVE', 890],
      ['HOSP-003', 'Fortis Clinical Care Systems', 'FORTIS_NET', 'HOSPITAL_HIS', 'https://interop.fortishealthcare.com/api', 'MOCK_HIS_ADAPTER', 'ACTIVE', 640],
      ['GOV-001', 'National Health Digital Network (ABDM Gateway)', 'ABDM_GATEWAY', 'GOVERNMENT_NETWORK', 'https://gateway.abdm.gov.in/v0.5', 'GOV_GATEWAY_ADAPTER', 'ACTIVE', 0],
    ];

    for (const [id, name, code, fType, url, adType, stat, count] of providers) {
      await conn.query(
        `INSERT INTO health_providers (provider_id, name, provider_code, facility_type, endpoint_url, adapter_type, status, records_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), endpoint_url = VALUES(endpoint_url), status = VALUES(status)`,
        [id, name, code, fType, url, adType, stat, count]
      );
    }
    console.log('✅ Seeded participating health provider endpoints');

    // 6. Link demo patients with mock MRNs and mock federated record references
    const [existingPatients] = await conn.query('SELECT patient_id, carecarry_id FROM patients LIMIT 5');
    for (const pat of existingPatients) {
      // Map patient to Apollo and Fortis
      await conn.query(
        `INSERT IGNORE INTO provider_patient_mappings (patient_id, carecarry_id, provider_id, provider_mrn)
         VALUES (?, ?, 'HOSP-001', CONCAT('AP-', SUBSTRING(?, 4)))`,
        [pat.patient_id, pat.carecarry_id, pat.carecarry_id]
      );
      await conn.query(
        `INSERT IGNORE INTO provider_patient_mappings (patient_id, carecarry_id, provider_id, provider_mrn)
         VALUES (?, ?, 'HOSP-002', CONCAT('MAX-', SUBSTRING(?, 4)))`,
        [pat.patient_id, pat.carecarry_id, pat.carecarry_id]
      );

      // Seed reference metadata for this patient in Apollo & Max
      const seedRefs = [
        [
          `REC-${pat.patient_id}-101`,
          pat.patient_id,
          pat.carecarry_id,
          'HOSP-001',
          'LAB_REPORT',
          'Comprehensive Metabolic Panel & Lipid Profile',
          'ENC-AP-4091',
          'LAB-AP-88219',
          'Apollo Hospitals Central HIS',
          'Dr. Rajesh Nair (Chief Biochemist)',
          '2026-08-14 11:30:00',
          'FEDERATED_API',
          'application/pdf',
          'Total Cholesterol: 182 mg/dL, HDL: 48 mg/dL, Triglycerides: 145 mg/dL. Normal renal panel.',
        ],
        [
          `REC-${pat.patient_id}-102`,
          pat.patient_id,
          pat.carecarry_id,
          'HOSP-001',
          'IMAGING_STUDY',
          '2D Echocardiography & Doppler Study',
          'ENC-AP-4091',
          'RAD-AP-77312',
          'Apollo Hospitals Central HIS',
          'Dr. Sunita Mehta (Consultant Cardiologist)',
          '2026-08-15 14:15:00',
          'FEDERATED_API',
          'application/pdf',
          'LVEF 62%, normal wall motion, no valvular regurgitation, normal diastolic filling.',
        ],
        [
          `REC-${pat.patient_id}-103`,
          pat.patient_id,
          pat.carecarry_id,
          'HOSP-002',
          'DISCHARGE_SUMMARY',
          'Acute Bronchitis Recovery & Discharge Summary',
          'ENC-MAX-1029',
          'DIS-MAX-90142',
          'Max Super Specialty EMR Network',
          'Dr. K. S. Verma (Pulmonologist)',
          '2026-07-28 17:00:00',
          'FEDERATED_API',
          'application/pdf',
          'Resolved acute respiratory infection treated with azithromycin. Stable on room air. Advised follow-up.',
        ],
        [
          `REC-${pat.patient_id}-104`,
          pat.patient_id,
          pat.carecarry_id,
          'HOSP-002',
          'PRESCRIPTION',
          'Maintenance Therapy & Inhaler Prescription',
          'ENC-MAX-1029',
          'RX-MAX-33120',
          'Max Super Specialty EMR Network',
          'Dr. K. S. Verma (Pulmonologist)',
          '2026-07-28 17:15:00',
          'FEDERATED_API',
          'application/pdf',
          'Formoterol + Budesonide inhaler 200mcg twice daily, Montelukast 10mg bedtime for 30 days.',
        ],
      ];

      for (const refRow of seedRefs) {
        await conn.query(
          `INSERT INTO federated_record_references (
            record_id, patient_id, carecarry_id, provider_id, record_type, title,
            encounter_ref, source_record_id, source_facility_name, source_doctor_name,
            source_created_at, access_method, mime_type, summary_snippet
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE title = VALUES(title), summary_snippet = VALUES(summary_snippet)`,
          refRow
        );
      }
    }
    console.log('✅ Seeded federated record references and patient provider mappings');

    console.log('🎉 Interoperability migration completed successfully!');
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateInteroperability().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
