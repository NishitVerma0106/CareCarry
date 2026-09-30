const { pool } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');
const { uploadFile } = require('../services/cloudinaryService');

/**
 * Helper to determine hospital_id from user
 */
const getHospitalIdForUser = async (user) => {
  if (user.role === 'hospital_staff') {
    const [staff] = await pool.query('SELECT hospital_id FROM hospital_staff WHERE user_id = ?', [user.user_id]);
    return staff[0]?.hospital_id || 1;
  }
  if (user.role === 'doctor') {
    const [doc] = await pool.query('SELECT hospital_id FROM doctors WHERE user_id = ?', [user.user_id]);
    return doc[0]?.hospital_id || 1;
  }
  return 1;
};

/**
 * Helper to generate Queue Token based on department
 * e.g. CARD-001, GEN-002, ORTH-003, EMG-001
 */
const generateTokenNumber = async (department = 'General Medicine') => {
  const codeMap = {
    'Cardiology': 'CARD',
    'General Medicine': 'GEN',
    'Orthopedics': 'ORTH',
    'Orthopedics & Trauma': 'ORTH',
    'Pediatrics': 'PED',
    'Pediatrics & Child Care': 'PED',
    'Neurology': 'NEUR',
    'Emergency': 'EMG',
    'Emergency & Urgent Care': 'EMG',
    'Dermatology': 'DERM',
    'Pulmonology': 'PULM',
    'Oncology': 'ONC',
  };
  const prefix = codeMap[department] || (department.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'GEN');

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM encounters
     WHERE DATE(visit_date) = CURDATE() AND (department = ? OR token_number LIKE ?)`,
    [department, `${prefix}-%`]
  );

  const seq = (rows[0]?.count || 0) + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
};

/**
 * POST /api/hospital/patients/resolve (and /api/hospital/patients/lookup)
 * Finds patient by CareCarry ID or QR token
 */
const resolvePatient = async (req, res, next) => {
  try {
    const { carecarryId, carecarry_id, token, qr_token, qrToken } = req.body;
    const lookupId = (carecarryId || carecarry_id || '').trim();
    const lookupToken = (token || qr_token || qrToken || '').trim();

    let patientId = null;

    if (lookupToken) {
      let rawToken = lookupToken;
      try {
        const parsed = JSON.parse(lookupToken);
        if (parsed.token) rawToken = parsed.token;
      } catch {}

      const [tokenRows] = await pool.query(
        `SELECT qt.patient_id, qt.expires_at, p.carecarry_id
         FROM qr_tokens qt
         JOIN patients p ON qt.patient_id = p.patient_id
         WHERE qt.token = ?`,
        [rawToken]
      );

      if (!tokenRows.length) {
        return res.status(404).json({ success: false, message: 'Invalid QR token.' });
      }

      if (new Date(tokenRows[0].expires_at) < new Date()) {
        return res.status(410).json({ success: false, message: 'QR token has expired. Patient must refresh QR code.' });
      }

      patientId = tokenRows[0].patient_id;
    } else if (lookupId) {
      const [rows] = await pool.query(
        'SELECT patient_id, carecarry_id FROM patients WHERE carecarry_id = ?',
        [lookupId]
      );
      if (!rows.length) {
        return res.status(404).json({ success: false, message: `Patient with CareCarry ID '${lookupId}' not found.` });
      }
      patientId = rows[0].patient_id;
    } else {
      return res.status(400).json({ success: false, message: 'Provide carecarryId or qr token.' });
    }

    const [rows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.date_of_birth, p.gender, p.blood_group,
              p.allergies, p.conditions, p.current_medications,
              u.first_name, u.last_name, u.phone, u.email
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.patient_id = ?`,
      [patientId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const p = rows[0];

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'PATIENT_IDENTIFIED',
      patient_id: p.patient_id,
      ip_address: req.ip,
    });

    const patientData = {
      patientId: p.patient_id,
      patient_id: p.patient_id,
      carecarryId: p.carecarry_id,
      carecarry_id: p.carecarry_id,
      name: `${p.first_name} ${p.last_name}`,
      firstName: p.first_name,
      lastName: p.last_name,
      first_name: p.first_name,
      last_name: p.last_name,
      dateOfBirth: p.date_of_birth,
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      bloodGroup: p.blood_group,
      blood_group: p.blood_group,
      allergies: p.allergies,
      conditions: p.conditions,
      phone: p.phone,
      email: p.email,
    };

    return res.status(200).json({
      success: true,
      data: {
        patient: patientData,
        ...patientData,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospital/encounters & POST /api/encounters
 * Creates hospital encounter with department, queue token, and routing
 */
const createEncounter = async (req, res, next) => {
  try {
    const {
      patientId,
      patient_id,
      carecarryId,
      carecarry_id,
      doctorId,
      doctor_id,
      department,
      departmentId,
      visitType,
      visit_type,
      reason,
      notes,
      visit_date,
      date,
    } = req.body;

    let pId = patientId || patient_id;

    // If carecarryId provided instead of patientId, resolve it
    if (!pId && (carecarryId || carecarry_id)) {
      const cid = (carecarryId || carecarry_id).trim();
      const [patRows] = await pool.query('SELECT patient_id FROM patients WHERE carecarry_id = ?', [cid]);
      if (patRows.length) pId = patRows[0].patient_id;
    }

    if (!pId) {
      return res.status(400).json({ success: false, message: 'Valid Patient ID or CareCarry ID is required.' });
    }

    const docId = doctorId || doctor_id || null;
    const vDept = department || departmentId || 'General Medicine';
    const vType = visitType || visit_type || 'OPD';
    const vReason = reason || notes || 'Clinical Consultation';
    const vDate = date || visit_date || new Date();

    const hospitalId = await getHospitalIdForUser(req.user);
    const tokenNumber = await generateTokenNumber(vDept);

    const [result] = await pool.query(
      `INSERT INTO encounters (
        patient_id, hospital_id, doctor_id, visit_type, department,
        token_number, visit_date, notes, status, queue_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'waiting')`,
      [pId, hospitalId, docId, vType, vDept, tokenNumber, vDate, vReason]
    );

    const encounterId = result.insertId;

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'ENCOUNTER_CREATED',
      patient_id: pId,
      encounter_id: encounterId,
      ip_address: req.ip,
      extra_data: { department: vDept, tokenNumber, visitType: vType },
    });

    return res.status(201).json({
      success: true,
      message: 'Encounter registered and assigned to queue successfully.',
      data: {
        encounterId,
        encounter_id: encounterId,
        tokenNumber,
        token_number: tokenNumber,
        department: vDept,
        status: 'CHECKED_IN',
        queueStatus: 'waiting',
        queue_status: 'waiting',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/encounters — get hospital encounters with department & queue info
 */
const getEncounters = async (req, res, next) => {
  try {
    const hospitalId = await getHospitalIdForUser(req.user);
    const { status, queue_status, department } = req.query;

    let query = `
      SELECT e.encounter_id, e.visit_date, e.visit_type, e.department, e.token_number,
             e.status, e.queue_status, e.notes, e.discharge_summary, e.discharge_date,
             e.patient_id, e.doctor_id,
             p.carecarry_id, u.first_name, u.last_name, u.phone,
             docUser.first_name AS doctor_first, docUser.last_name AS doctor_last,
             d.specialization,
             COUNT(DISTINCT mr.report_id) AS document_count,
             COUNT(DISTINCT lo.order_id) AS lab_order_count
      FROM encounters e
      JOIN patients p ON e.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN doctors d ON e.doctor_id = d.doctor_id
      LEFT JOIN users docUser ON d.user_id = docUser.user_id
      LEFT JOIN medical_reports mr ON e.encounter_id = mr.encounter_id
      LEFT JOIN lab_orders lo ON e.encounter_id = lo.encounter_id
      WHERE e.hospital_id = ?
    `;

    const params = [hospitalId];

    if (queue_status) {
      query += ' AND e.queue_status = ?';
      params.push(queue_status);
    }
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    query += ' GROUP BY e.encounter_id ORDER BY e.visit_date DESC LIMIT 150';

    const [encounters] = await pool.query(query, params);

    return res.status(200).json({ success: true, data: encounters });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/encounters/:id — get encounter details including clinical records, lab orders, pharmacy
 */
const getEncounter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [enc] = await pool.query(
      `SELECT e.*, h.name AS hospital_name,
              u.first_name AS patient_first, u.last_name AS patient_last, u.phone AS patient_phone,
              p.carecarry_id, p.date_of_birth, p.gender, p.blood_group, p.allergies, p.conditions,
              ud.first_name AS doctor_first, ud.last_name AS doctor_last,
              d.specialization
       FROM encounters e
       JOIN patients p ON e.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors d ON e.doctor_id = d.doctor_id
       LEFT JOIN users ud ON d.user_id = ud.user_id
       WHERE e.encounter_id = ?`,
      [id]
    );

    if (!enc.length) {
      return res.status(404).json({ success: false, message: 'Encounter not found.' });
    }

    // Reports
    const [reports] = await pool.query(
      'SELECT * FROM medical_reports WHERE encounter_id = ? ORDER BY uploaded_at DESC',
      [id]
    );

    // Consultations & diagnoses
    const [consultations] = await pool.query(
      `SELECT c.*, diag.diagnosis, diag.remarks AS diagnosis_remarks, diag.icd_code
       FROM consultations c
       LEFT JOIN diagnoses diag ON c.consultation_id = diag.consultation_id
       WHERE c.encounter_id = ?
       ORDER BY c.created_at DESC`,
      [id]
    );

    // Lab Orders
    const [labOrders] = await pool.query(
      `SELECT lo.*, mr.secure_file_url, mr.title AS report_title
       FROM lab_orders lo
       LEFT JOIN medical_reports mr ON lo.result_report_id = mr.report_id
       WHERE lo.encounter_id = ?
       ORDER BY lo.created_at DESC`,
      [id]
    );

    // Prescriptions & items
    const [prescriptions] = await pool.query(
      `SELECT pr.*, u.first_name AS doctor_first, u.last_name AS doctor_last
       FROM prescriptions pr
       JOIN consultations c ON pr.consultation_id = c.consultation_id
       LEFT JOIN doctors dr ON c.doctor_id = dr.doctor_id
       LEFT JOIN users u ON dr.user_id = u.user_id
       WHERE c.encounter_id = ?
       ORDER BY pr.created_at DESC`,
      [id]
    );

    const fullPrescriptions = await Promise.all(
      prescriptions.map(async (pr) => {
        const [items] = await pool.query(
          'SELECT * FROM prescription_items WHERE prescription_id = ?',
          [pr.prescription_id]
        );
        return { ...pr, items };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        encounter: enc[0],
        reports,
        consultations,
        labOrders,
        prescriptions: fullPrescriptions,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/hospital/encounters/:id/status & PATCH /api/encounters/:id/status
 * Updates queue status (waiting -> in_consultation -> completed -> cancelled)
 */
const updateEncounterStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, queue_status, queueStatus } = req.body;
    const targetQueue = (queue_status || queueStatus || status || '').toLowerCase();

    const validQueue = ['waiting', 'in_consultation', 'completed', 'cancelled'];
    if (!validQueue.includes(targetQueue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validQueue.join(', ')}`,
      });
    }

    const overallStatus = targetQueue === 'completed' ? 'completed' : targetQueue === 'cancelled' ? 'cancelled' : 'active';

    const [encRows] = await pool.query('SELECT patient_id FROM encounters WHERE encounter_id = ?', [id]);
    if (!encRows.length) {
      return res.status(404).json({ success: false, message: 'Encounter not found.' });
    }

    await pool.query(
      'UPDATE encounters SET queue_status = ?, status = ?, updated_at = NOW() WHERE encounter_id = ?',
      [targetQueue, overallStatus, id]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'ENCOUNTER_STATUS_CHANGED',
      patient_id: encRows[0].patient_id,
      encounter_id: Number(id),
      ip_address: req.ip,
      extra_data: { queue_status: targetQueue, status: overallStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Encounter status updated to ${targetQueue}.`,
      data: {
        encounterId: Number(id),
        queueStatus: targetQueue,
        status: overallStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospital/encounters/:id/discharge & POST /api/encounters/:id/discharge
 * Discharge summary at the end of an encounter
 */
const dischargeEncounter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      diagnosis,
      treatment,
      medications,
      followUpDate,
      summaryDocument,
      discharge_summary,
      notes,
    } = req.body;

    const [encRows] = await pool.query('SELECT patient_id FROM encounters WHERE encounter_id = ?', [id]);
    if (!encRows.length) {
      return res.status(404).json({ success: false, message: 'Encounter not found.' });
    }

    // Build comprehensive discharge summary document string
    let fullSummary = discharge_summary || '';
    if (!fullSummary) {
      const parts = [];
      if (diagnosis) parts.push(`Primary Diagnosis: ${diagnosis}`);
      if (treatment) parts.push(`Treatment Administered: ${treatment}`);
      if (Array.isArray(medications) && medications.length) {
        parts.push(`Medications on Discharge:\n${medications.map((m) => `• ${typeof m === 'object' ? `${m.name} (${m.dosage || ''} ${m.frequency || ''})` : m}`).join('\n')}`);
      }
      if (followUpDate) parts.push(`Follow-up Scheduled: ${followUpDate}`);
      if (notes) parts.push(`Discharge Advice: ${notes}`);
      fullSummary = parts.join('\n\n') || 'Discharged in stable condition.';
    }

    await pool.query(
      `UPDATE encounters SET
        discharge_summary = ?,
        discharge_date = NOW(),
        status = 'completed',
        queue_status = 'completed',
        updated_at = NOW()
       WHERE encounter_id = ?`,
      [fullSummary, id]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'ENCOUNTER_DISCHARGED',
      patient_id: encRows[0].patient_id,
      encounter_id: Number(id),
      ip_address: req.ip,
      extra_data: { followUpDate },
    });

    return res.status(200).json({
      success: true,
      message: 'Patient encounter discharged successfully.',
      data: {
        encounterId: Number(id),
        dischargeSummary: fullSummary,
        status: 'completed',
        queueStatus: 'completed',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/stats — Command Center Live Metrics
 */
const getHospitalStats = async (req, res, next) => {
  try {
    const hospitalId = await getHospitalIdForUser(req.user);

    // Encounters today
    const [todayRows] = await pool.query(
      `SELECT
        COUNT(*) AS total_today,
        SUM(CASE WHEN queue_status = 'waiting' THEN 1 ELSE 0 END) AS waiting_count,
        SUM(CASE WHEN queue_status = 'in_consultation' THEN 1 ELSE 0 END) AS in_consultation_count,
        SUM(CASE WHEN queue_status = 'completed' THEN 1 ELSE 0 END) AS completed_count
       FROM encounters
       WHERE hospital_id = ? AND DATE(visit_date) = CURDATE()`,
      [hospitalId]
    );

    // Active verified doctors
    const [docRows] = await pool.query(
      `SELECT COUNT(*) AS active_doctors
       FROM doctors d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.hospital_id = ? AND d.verification_status = 'verified' AND u.is_active = 1`,
      [hospitalId]
    );

    // Total documents uploaded
    const [docCount] = await pool.query(
      'SELECT COUNT(*) AS total_reports FROM medical_reports WHERE hospital_id = ?',
      [hospitalId]
    );

    // Pending lab orders
    const [labCount] = await pool.query(
      `SELECT COUNT(*) AS pending_lab_orders
       FROM lab_orders
       WHERE hospital_id = ? AND status != 'COMPLETED'`,
      [hospitalId]
    );

    const stats = {
      todayPatients: todayRows[0]?.total_today || 0,
      waitingCount: todayRows[0]?.waiting_count || 0,
      inConsultationCount: todayRows[0]?.in_consultation_count || 0,
      completedCount: todayRows[0]?.completed_count || 0,
      activeDoctors: docRows[0]?.active_doctors || 0,
      totalReports: docCount[0]?.total_reports || 0,
      pendingLabOrders: labCount[0]?.pending_lab_orders || 0,
    };

    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/departments — List of clinical departments with load
 */
const getHospitalDepartments = async (req, res, next) => {
  try {
    const hospitalId = await getHospitalIdForUser(req.user);

    const departmentsList = [
      { id: 'GEN', name: 'General Medicine', description: 'Primary healthcare, internal medicine & general consultation' },
      { id: 'CARD', name: 'Cardiology', description: 'Heart, cardiovascular diagnostics & clinical cardiology' },
      { id: 'ORTH', name: 'Orthopedics & Trauma', description: 'Bone, joint, spine & trauma management' },
      { id: 'PED', name: 'Pediatrics & Child Care', description: 'Newborn, infant, child healthcare & vaccinations' },
      { id: 'NEUR', name: 'Neurology', description: 'Nervous system, stroke & brain disorder consultation' },
      { id: 'EMG', name: 'Emergency & Urgent Care', description: '24/7 triage, trauma resuscitation & acute care' },
      { id: 'DERM', name: 'Dermatology', description: 'Skin, hair, allergy & dermatological care' },
      { id: 'PULM', name: 'Pulmonology', description: 'Respiratory diseases, asthma & lung care' },
    ];

    // Compute active queue and doctor counts per department
    const [queueRows] = await pool.query(
      `SELECT department,
              COUNT(*) AS total_encounters,
              SUM(CASE WHEN queue_status = 'waiting' THEN 1 ELSE 0 END) AS waiting_patients
       FROM encounters
       WHERE hospital_id = ? AND DATE(visit_date) = CURDATE()
       GROUP BY department`,
      [hospitalId]
    );

    const [doctorRows] = await pool.query(
      `SELECT specialization, COUNT(*) AS doc_count
       FROM doctors
       WHERE hospital_id = ? AND verification_status = 'verified'
       GROUP BY specialization`,
      [hospitalId]
    );

    const queueMap = {};
    queueRows.forEach((r) => { queueMap[r.department] = r; });

    const docMap = {};
    doctorRows.forEach((r) => { docMap[r.specialization] = r.doc_count; });

    const departments = departmentsList.map((d) => ({
      ...d,
      waitingPatients: queueMap[d.name]?.waiting_patients || 0,
      totalEncountersToday: queueMap[d.name]?.total_encounters || 0,
      doctorsCount: docMap[d.name] || (d.id === 'GEN' ? 2 : 1),
    }));

    return res.status(200).json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospital/encounters/:id/reports (and /api/hospital/reports)
 * Uploads medical documents (Section 13)
 */
const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    const encounterIdParam = req.params.id;
    const {
      patient_id,
      patientId,
      encounter_id,
      document_type = 'lab_report',
      title,
      description,
      labOrderId,
    } = req.body;

    let targetEncounterId = encounterIdParam || encounter_id || null;
    let targetPatientId = patient_id || patientId || null;

    if (targetEncounterId && !targetPatientId) {
      const [enc] = await pool.query('SELECT patient_id FROM encounters WHERE encounter_id = ?', [targetEncounterId]);
      if (enc.length) targetPatientId = enc[0].patient_id;
    }

    if (!targetPatientId) {
      return res.status(400).json({ success: false, message: 'Patient ID or valid Encounter ID is required.' });
    }

    const hospitalId = await getHospitalIdForUser(req.user);
    const reportTitle = title || req.file.originalname;

    const cloudResult = await uploadFile(req.file.buffer, {
      originalname: req.file.originalname,
      folder: `carecarry/hospitals/${hospitalId}/reports`,
      tags: ['hospital_upload', document_type],
    });

    const [result] = await pool.query(
      `INSERT INTO medical_reports
       (patient_id, encounter_id, hospital_id, document_type, title, description,
        file_name, cloudinary_public_id, secure_file_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetPatientId,
        targetEncounterId,
        hospitalId,
        document_type,
        reportTitle,
        description || null,
        req.file.originalname,
        cloudResult.public_id,
        cloudResult.secure_url,
        req.user.user_id,
      ]
    );

    const reportId = result.insertId;

    // If attached to a lab order, link and complete it
    if (labOrderId) {
      await pool.query(
        'UPDATE lab_orders SET result_report_id = ?, status = "COMPLETED" WHERE order_id = ?',
        [reportId, labOrderId]
      );
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'HOSPITAL_REPORT_UPLOADED',
      patient_id: targetPatientId,
      encounter_id: targetEncounterId,
      resource_type: 'medical_report',
      resource_id: reportId,
      ip_address: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Medical document uploaded successfully.',
      data: {
        reportId,
        title: reportTitle,
        fileName: req.file.originalname,
        documentType: document_type,
        secureUrl: cloudResult.secure_url,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/encounters/:id/reports
 */
const getEncounterReports = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [reports] = await pool.query(
      'SELECT * FROM medical_reports WHERE encounter_id = ? ORDER BY uploaded_at DESC',
      [id]
    );
    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/doctors — get verified doctors to assign
 */
const getHospitalDoctors = async (req, res, next) => {
  try {
    const [doctors] = await pool.query(
      `SELECT d.doctor_id, d.license_number, d.specialization, d.hospital_id,
              u.first_name, u.last_name, u.email,
              h.name AS hospital_name
       FROM doctors d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
       WHERE d.verification_status = 'verified' AND u.is_active = 1
       ORDER BY u.first_name ASC`
    );

    return res.status(200).json({ success: true, data: doctors });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospital/encounters/:id/lab-orders & POST /api/lab/orders
 * Creates laboratory test order attached to encounter
 */
const createLabOrder = async (req, res, next) => {
  try {
    const encounterId = req.params.id || req.body.encounterId || req.body.encounter_id;
    const { tests = [], test_name, notes } = req.body;

    if (!encounterId) {
      return res.status(400).json({ success: false, message: 'Encounter ID is required.' });
    }

    const [encRows] = await pool.query('SELECT patient_id, hospital_id FROM encounters WHERE encounter_id = ?', [encounterId]);
    if (!encRows.length) {
      return res.status(404).json({ success: false, message: 'Encounter not found.' });
    }

    const { patient_id, hospital_id } = encRows[0];
    const testList = Array.isArray(tests) && tests.length ? tests : (test_name ? [test_name] : ['Routine Lab Investigation']);

    const createdOrders = [];
    for (const testName of testList) {
      const [resOrder] = await pool.query(
        `INSERT INTO lab_orders (encounter_id, patient_id, hospital_id, ordered_by, test_name, status, notes)
         VALUES (?, ?, ?, ?, ?, 'ORDERED', ?)`,
        [encounterId, patient_id, hospital_id, req.user.user_id, testName, notes || null]
      );
      createdOrders.push({ orderId: resOrder.insertId, testName, status: 'ORDERED' });
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'LAB_ORDER_CREATED',
      patient_id,
      encounter_id: Number(encounterId),
      ip_address: req.ip,
      extra_data: { tests: testList },
    });

    return res.status(201).json({
      success: true,
      message: 'Laboratory test order created.',
      data: { orders: createdOrders },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/encounters/:id/lab-orders & GET /api/lab/orders
 */
const getLabOrders = async (req, res, next) => {
  try {
    const encounterId = req.params.id || req.query.encounterId;
    const hospitalId = await getHospitalIdForUser(req.user);

    let query = `
      SELECT lo.*, p.carecarry_id, u.first_name AS patient_first, u.last_name AS patient_last,
             e.token_number, e.department,
             mr.secure_file_url, mr.title AS report_title, mr.file_name
      FROM lab_orders lo
      JOIN patients p ON lo.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      JOIN encounters e ON lo.encounter_id = e.encounter_id
      LEFT JOIN medical_reports mr ON lo.result_report_id = mr.report_id
      WHERE 1=1
    `;
    const params = [];

    if (encounterId) {
      query += ' AND lo.encounter_id = ?';
      params.push(encounterId);
    } else {
      query += ' AND lo.hospital_id = ?';
      params.push(hospitalId);
    }

    query += ' ORDER BY lo.created_at DESC LIMIT 100';

    const [orders] = await pool.query(query, params);
    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/hospital/lab-orders/:id/status & PATCH /api/lab/orders/:id/status
 */
const updateLabOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, result_report_id } = req.body;

    const validStatus = ['ORDERED', 'SAMPLE_COLLECTED', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatus.join(', ')}` });
    }

    await pool.query(
      `UPDATE lab_orders SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        result_report_id = COALESCE(?, result_report_id),
        updated_at = NOW()
       WHERE order_id = ?`,
      [status || null, notes || null, result_report_id || null, id]
    );

    return res.status(200).json({ success: true, message: 'Lab order status updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospital/pharmacy/prescriptions & GET /api/pharmacy/prescriptions
 */
const getPharmacyPrescriptions = async (req, res, next) => {
  try {
    const hospitalId = await getHospitalIdForUser(req.user);
    const encounterId = req.params.encounterId || req.query.encounterId;

    let query = `
      SELECT pr.prescription_id, pr.consultation_id, pr.instructions, pr.created_at,
             e.encounter_id, e.token_number, e.department, e.visit_date,
             p.carecarry_id, u.first_name AS patient_first, u.last_name AS patient_last,
             docUser.first_name AS doctor_first, docUser.last_name AS doctor_last
      FROM prescriptions pr
      JOIN consultations c ON pr.consultation_id = c.consultation_id
      JOIN encounters e ON c.encounter_id = e.encounter_id
      JOIN patients p ON e.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN doctors d ON c.doctor_id = d.doctor_id
      LEFT JOIN users docUser ON d.user_id = docUser.user_id
      WHERE e.hospital_id = ?
    `;
    const params = [hospitalId];

    if (encounterId) {
      query += ' AND e.encounter_id = ?';
      params.push(encounterId);
    }

    query += ' ORDER BY pr.created_at DESC LIMIT 100';

    const [prescriptions] = await pool.query(query, params);

    const fullPrescriptions = await Promise.all(
      prescriptions.map(async (pr) => {
        const [items] = await pool.query(
          'SELECT * FROM prescription_items WHERE prescription_id = ?',
          [pr.prescription_id]
        );
        return { ...pr, items };
      })
    );

    return res.status(200).json({ success: true, data: fullPrescriptions });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/hospital/pharmacy/items/:itemId/dispense
 * Marks a medication as DISPENSED
 */
const dispensePrescriptionItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status = 'DISPENSED' } = req.body;

    const [itemRows] = await pool.query('SELECT * FROM prescription_items WHERE item_id = ?', [itemId]);
    if (!itemRows.length) {
      return res.status(404).json({ success: false, message: 'Prescription item not found.' });
    }

    await pool.query(
      `UPDATE prescription_items SET
        status = ?,
        dispensed_at = CASE WHEN ? = 'DISPENSED' THEN NOW() ELSE NULL END
       WHERE item_id = ?`,
      [status, status, itemId]
    );

    return res.status(200).json({
      success: true,
      message: `Medication marked as ${status}.`,
      data: { itemId: Number(itemId), status },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  resolvePatient,
  createEncounter,
  getEncounters,
  getEncounter,
  updateEncounterStatus,
  dischargeEncounter,
  getHospitalStats,
  getHospitalDepartments,
  getHospitalDoctors,
  uploadReport,
  getEncounterReports,
  createLabOrder,
  getLabOrders,
  updateLabOrderStatus,
  getPharmacyPrescriptions,
  dispensePrescriptionItem,
};
