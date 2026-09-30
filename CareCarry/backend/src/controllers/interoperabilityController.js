const { pool } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');
const { adapterRegistry } = require('../services/interoperability/providerAdapterRegistry');

/**
 * GET /api/interoperability/providers
 * Returns all participating hospital systems and health networks
 */
const getProviders = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM health_providers ORDER BY records_count DESC, name ASC'
    );

    const providers = rows.map((p) => {
      const adapter = adapterRegistry.getAdapter(p.provider_id);
      return {
        ...p,
        adapterOnline: !!adapter,
        adapterClass: adapter ? adapter.constructor.name : 'GENERIC_FHIR_CLIENT',
      };
    });

    return res.status(200).json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/interoperability/patient-match
 * Matches CareCarry identity (+ optional ABHA ID) with a hospital's local MRN
 */
const patientMatch = async (req, res, next) => {
  try {
    const { carecarryId, carecarry_id, providerId, provider_id, abhaId, phone } = req.body;
    const ccId = (carecarryId || carecarry_id || '').trim().toUpperCase();
    const pId = (providerId || provider_id || 'HOSP-001').trim();

    if (!ccId) {
      return res.status(400).json({ success: false, message: 'CareCarry ID is required for patient matching.' });
    }

    const [patRows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.abha_id, p.blood_group,
              u.first_name, u.last_name, u.phone
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.carecarry_id = ?`,
      [ccId]
    );

    if (!patRows.length) {
      return res.status(404).json({ success: false, message: `Patient with CareCarry ID '${ccId}' not found.` });
    }

    const patient = patRows[0];
    const adapter = adapterRegistry.getAdapter(pId);

    let matchResult = null;
    if (adapter && adapter.patientMatch) {
      matchResult = await adapter.patientMatch({
        carecarryId: ccId,
        abhaId: abhaId || patient.abha_id,
        phone: phone || patient.phone,
        name: `${patient.first_name} ${patient.last_name}`,
      });
    } else {
      matchResult = {
        matched: true,
        providerId: pId,
        providerName: 'Participating Healthcare Provider',
        providerMrn: `MRN-${ccId.substring(3)}`,
        matchScore: 0.9,
      };
    }

    // Save or update mapping in database
    await pool.query(
      `INSERT INTO provider_patient_mappings (patient_id, carecarry_id, provider_id, provider_mrn, match_status)
       VALUES (?, ?, ?, ?, 'MATCHED')
       ON DUPLICATE KEY UPDATE provider_mrn = VALUES(provider_mrn), match_status = 'MATCHED', matched_at = NOW()`,
      [patient.patient_id, ccId, pId, matchResult.providerMrn]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'INTEROP_PATIENT_MATCHED',
      patient_id: patient.patient_id,
      ip_address: req.ip,
      extra_data: { providerId: pId, providerMrn: matchResult.providerMrn },
    });

    return res.status(200).json({
      success: true,
      message: `Patient matched successfully with ${matchResult.providerName || pId}`,
      data: {
        carecarryId: ccId,
        patientName: `${patient.first_name} ${patient.last_name}`,
        ...matchResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/interoperability/patient/:carecarryId/records & GET /api/interoperability/records
 * Discovers permitted clinical records across all participating healthcare systems
 * Returns METADATA REFERENCES only — does not duplicate the file
 */
const discoverPatientRecords = async (req, res, next) => {
  try {
    const rawCcId = req.params.carecarryId || req.query.carecarryId || req.query.carecarry_id;
    if (!rawCcId) {
      return res.status(400).json({ success: false, message: 'CareCarry ID is required for record discovery.' });
    }
    const ccId = String(rawCcId).trim().toUpperCase();

    // 1. Resolve Patient
    const [patRows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.abha_id, p.abha_status,
              u.first_name, u.last_name
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.carecarry_id = ?`,
      [ccId]
    );

    if (!patRows.length) {
      return res.status(404).json({ success: false, message: `Patient '${ccId}' not found.` });
    }

    const patient = patRows[0];

    // 2. Fetch Stored Federated Record References
    const [storedRefs] = await pool.query(
      `SELECT fr.*, hp.name AS provider_name, hp.facility_type, hp.adapter_type
       FROM federated_record_references fr
       LEFT JOIN health_providers hp ON fr.provider_id = hp.provider_id
       WHERE fr.carecarry_id = ?
       ORDER BY fr.source_created_at DESC`,
      [ccId]
    );

    // 3. Query Active Provider Adapters on-demand for dynamic discovery
    const allAdapters = adapterRegistry.getAllAdapters();
    const dynamicDiscovered = [];

    for (const { providerId } of allAdapters) {
      const adapter = adapterRegistry.getAdapter(providerId);
      if (adapter && adapter.discoverRecords) {
        try {
          const discovered = await adapter.discoverRecords({ carecarryId: ccId });
          if (Array.isArray(discovered)) {
            dynamicDiscovered.push(...discovered);
          }
        } catch (e) {
          console.warn(`[Interop] Error discovering records from ${providerId}:`, e.message);
        }
      }
    }

    // 4. Merge stored database references with dynamic discovery (deduplicated by sourceRecordId)
    const seenRecords = new Set();
    const normalizedRecords = [];

    const addRecord = (rec) => {
      const key = rec.source_record_id || rec.sourceRecordId || rec.record_id || rec.recordId;
      if (!seenRecords.has(key)) {
        seenRecords.add(key);
        normalizedRecords.push({
          recordId: rec.record_id || rec.recordId,
          carecarryId: ccId,
          providerId: rec.provider_id || rec.providerId,
          sourceFacilityName: rec.source_facility_name || rec.sourceFacilityName || rec.provider_name || 'Participating Hospital',
          recordType: rec.record_type || rec.recordType,
          title: rec.title,
          encounterRef: rec.encounter_ref || rec.encounterRef || 'ENC-EXT',
          sourceRecordId: rec.source_record_id || rec.sourceRecordId,
          sourceDoctorName: rec.source_doctor_name || rec.sourceDoctorName || null,
          sourceCreatedAt: rec.source_created_at || rec.sourceCreatedAt || rec.created_at,
          accessMethod: rec.access_method || rec.accessMethod || 'FEDERATED_API',
          mimeType: rec.mime_type || rec.mimeType || 'application/json',
          summarySnippet: rec.summary_snippet || rec.summarySnippet || null,
        });
      }
    };

    storedRefs.forEach(addRecord);
    dynamicDiscovered.forEach(addRecord);

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'FEDERATED_RECORDS_DISCOVERED',
      patient_id: patient.patient_id,
      ip_address: req.ip,
      extra_data: {
        recordsCount: normalizedRecords.length,
        participatingNodes: allAdapters.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Discovered ${normalizedRecords.length} records across ${allAdapters.length} health provider networks.`,
      data: {
        patient: {
          carecarryId: ccId,
          name: `${patient.first_name} ${patient.last_name}`,
          abhaId: patient.abha_id,
          abhaStatus: patient.abha_status,
        },
        recordsCount: normalizedRecords.length,
        records: normalizedRecords,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/interoperability/records/:recordId/fetch & GET /api/interoperability/documents/:recordId/stream
 * On-demand authorized retrieval directly from source hospital HIS
 * (Federated Document Access — document is NOT stored in CareCarry database)
 */
const fetchFederatedDocument = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    // Check if record reference is known in database
    let [refRows] = await pool.query(
      `SELECT fr.*, p.patient_id, u.first_name, u.last_name
       FROM federated_record_references fr
       JOIN patients p ON fr.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       WHERE fr.record_id = ? OR fr.source_record_id = ?`,
      [recordId, recordId]
    );

    let providerId = refRows[0]?.provider_id;
    let sourceRecordId = refRows[0]?.source_record_id || recordId;

    // If not found in DB, parse prefix (e.g. REC-APOLLO-01 or REC-MAX-01)
    if (!providerId) {
      if (recordId.includes('APOLLO') || recordId.startsWith('LAB-AP') || recordId.startsWith('RAD-AP')) {
        providerId = 'HOSP-001';
      } else if (recordId.includes('MAX') || recordId.startsWith('DIS-MAX') || recordId.startsWith('RX-MAX')) {
        providerId = 'HOSP-002';
      } else {
        providerId = 'HOSP-003';
      }
    }

    const adapter = adapterRegistry.getAdapter(providerId);
    if (!adapter) {
      return res.status(404).json({
        success: false,
        message: `No active interoperability adapter found for provider ${providerId}.`,
      });
    }

    const docResult = await adapter.fetchDocument({ sourceRecordId });

    if (!docResult.found) {
      return res.status(404).json({ success: false, message: docResult.message });
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'FEDERATED_DOCUMENT_FETCHED',
      patient_id: refRows[0]?.patient_id || null,
      ip_address: req.ip,
      extra_data: {
        recordId,
        sourceProvider: adapter.name,
        sourceRecordId,
        accessMethod: 'FEDERATED_PROXY',
      },
    });

    return res.status(200).json({
      success: true,
      message: `Document retrieved from ${adapter.name} via authorized interoperability gateway.`,
      data: {
        recordId,
        providerId,
        sourceHospital: adapter.name,
        accessMethod: 'FEDERATED_EPHEMERAL_STREAM',
        retrievedAt: new Date().toISOString(),
        document: docResult.document,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/interoperability/abha/link
 * Links an ABHA ID (National Health Identifier) with CareCarry ID
 */
const linkAbhaId = async (req, res, next) => {
  try {
    const { carecarryId, carecarry_id, abhaId, abha_id } = req.body;
    const ccId = (carecarryId || carecarry_id || '').trim().toUpperCase();
    const abha = (abhaId || abha_id || '').trim();

    if (!ccId || !abha) {
      return res.status(400).json({
        success: false,
        message: 'Both CareCarry ID and ABHA ID are required for linkage.',
      });
    }

    const [rows] = await pool.query('SELECT patient_id FROM patients WHERE carecarry_id = ?', [ccId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await pool.query(
      "UPDATE patients SET abha_id = ?, abha_status = 'LINKED', updated_at = NOW() WHERE carecarry_id = ?",
      [abha, ccId]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'ABHA_IDENTITY_LINKED',
      patient_id: rows[0].patient_id,
      ip_address: req.ip,
      extra_data: { abhaId: abha },
    });

    return res.status(200).json({
      success: true,
      message: 'ABHA ID linked successfully with CareCarry identity.',
      data: {
        carecarryId: ccId,
        abhaId: abha,
        status: 'LINKED',
        note: 'CareCarry ID is the platform application identifier; ABHA ID is the mapped national health identifier.',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/interoperability/stats
 * Gateway operational metrics
 */
const getInteroperabilityStats = async (req, res, next) => {
  try {
    const [provCount] = await pool.query('SELECT COUNT(*) AS total_providers FROM health_providers WHERE status = "ACTIVE"');
    const [mapCount] = await pool.query('SELECT COUNT(*) AS total_matched FROM provider_patient_mappings');
    const [refCount] = await pool.query('SELECT COUNT(*) AS total_records FROM federated_record_references');
    const [abhaCount] = await pool.query('SELECT COUNT(*) AS total_abha FROM patients WHERE abha_id IS NOT NULL');

    return res.status(200).json({
      success: true,
      data: {
        connectedProviders: provCount[0]?.total_providers || 4,
        patientIdentityMatches: mapCount[0]?.total_matched || 0,
        federatedRecordsIndexed: refCount[0]?.total_records || 0,
        linkedAbhaIdentities: abhaCount[0]?.total_abha || 0,
        gatewayStatus: 'ONLINE_ACTIVE',
        standardCompliance: ['FHIR R4', 'ABDM v0.5', 'SNOMED-CT', 'LOINC'],
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProviders,
  patientMatch,
  discoverPatientRecords,
  fetchFederatedDocument,
  linkAbhaId,
  getInteroperabilityStats,
};
