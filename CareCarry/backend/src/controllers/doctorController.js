const { pool } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

/**
 * Helper to get doctor record from user ID
 */
const getDoctorByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM doctors WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

/**
 * GET /api/doctor/encounters (and /api/doctor/me/queue)
 * Returns assigned encounters for this doctor (Section 14)
 */
const getEncounters = async (req, res, next) => {
  try {
    const doctor = await getDoctorByUserId(req.user.user_id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const [encounters] = await pool.query(
      `SELECT e.encounter_id, e.visit_date, e.visit_type, e.department, e.token_number,
              e.status, e.queue_status, e.notes AS reason,
              p.patient_id, p.carecarry_id, p.date_of_birth, p.gender, p.blood_group,
              u.first_name, u.last_name, u.phone,
              h.name AS hospital_name,
              COUNT(DISTINCT c.consultation_id) AS consultation_count,
              COUNT(DISTINCT mr.report_id) AS report_count
       FROM encounters e
       JOIN patients p ON e.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN consultations c ON e.encounter_id = c.encounter_id
       LEFT JOIN medical_reports mr ON e.encounter_id = mr.encounter_id
       WHERE e.doctor_id = ? OR e.doctor_id IS NULL
       GROUP BY e.encounter_id
       ORDER BY e.visit_date DESC
       LIMIT 100`,
      [doctor.doctor_id]
    );

    return res.status(200).json({ success: true, data: encounters });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/encounters/:id/clinical-summary OR /api/doctor/patients/:patientId/summary
 * Scoped clinical view per Section 15
 */
const getClinicalSummary = async (req, res, next) => {
  try {
    const doctor = await getDoctorByUserId(req.user.user_id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const { id, patientId } = req.params;

    let targetPatientId = patientId;
    let currentEncounter = null;

    if (id) {
      // id is encounterId
      const [encRows] = await pool.query(
        `SELECT e.*, h.name AS hospital_name
         FROM encounters e
         LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
         WHERE e.encounter_id = ?`,
        [id]
      );
      if (!encRows.length) {
        return res.status(404).json({ success: false, message: 'Encounter not found.' });
      }
      currentEncounter = encRows[0];
      targetPatientId = currentEncounter.patient_id;
    }

    // Patient info
    const [patientRows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.abha_id, p.abha_status,
              p.date_of_birth, p.gender, p.blood_group,
              p.allergies, p.conditions, p.current_medications, p.emergency_notes,
              u.first_name, u.last_name, u.phone, u.email
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.patient_id = ?`,
      [targetPatientId]
    );

    if (!patientRows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const patient = patientRows[0];

    // Previous Diagnoses
    const [diagnoses] = await pool.query(
      `SELECT d.diagnosis_id, d.diagnosis, d.icd_code, d.remarks, d.created_at,
              c.symptoms, e.visit_date, h.name AS hospital_name
       FROM diagnoses d
       JOIN consultations c ON d.consultation_id = c.consultation_id
       JOIN encounters e ON c.encounter_id = e.encounter_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       WHERE e.patient_id = ?
       ORDER BY d.created_at DESC
       LIMIT 25`,
      [targetPatientId]
    );

    // Previous Prescriptions with items
    const [prescriptions] = await pool.query(
      `SELECT pr.prescription_id, pr.instructions, pr.created_at,
              e.visit_date, h.name AS hospital_name,
              u.first_name AS doctor_first, u.last_name AS doctor_last
       FROM prescriptions pr
       JOIN consultations c ON pr.consultation_id = c.consultation_id
       JOIN encounters e ON c.encounter_id = e.encounter_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors dr ON c.doctor_id = dr.doctor_id
       LEFT JOIN users u ON dr.user_id = u.user_id
       WHERE e.patient_id = ?
       ORDER BY pr.created_at DESC
       LIMIT 25`,
      [targetPatientId]
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

    // Previous Consultations
    const [consultations] = await pool.query(
      `SELECT c.consultation_id, c.symptoms, c.clinical_notes, c.follow_up, c.created_at,
              e.encounter_id, e.visit_date, e.visit_type,
              h.name AS hospital_name,
              u.first_name AS doctor_first, u.last_name AS doctor_last,
              diag.diagnosis, diag.remarks AS diagnosis_remarks
       FROM consultations c
       JOIN encounters e ON c.encounter_id = e.encounter_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors dr ON c.doctor_id = dr.doctor_id
       LEFT JOIN users u ON dr.user_id = u.user_id
       LEFT JOIN diagnoses diag ON c.consultation_id = diag.consultation_id
       WHERE e.patient_id = ?
       ORDER BY c.created_at DESC
       LIMIT 15`,
      [targetPatientId]
    );

    // Reports available
    const [reports] = await pool.query(
      `SELECT report_id, title, document_type, file_name, secure_file_url, uploaded_at, hospital_name
       FROM medical_reports
       WHERE patient_id = ?
       ORDER BY uploaded_at DESC
       LIMIT 20`,
      [targetPatientId]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'doctor',
      action: 'VIEW_CLINICAL_SUMMARY',
      patient_id: targetPatientId,
      encounter_id: currentEncounter?.encounter_id || null,
      ip_address: req.ip,
    });

    return res.status(200).json({
      success: true,
      data: {
        patient,
        encounter: currentEncounter,
        diagnoses,
        prescriptions: fullPrescriptions,
        consultations,
        reports,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/doctor/consultations — record consultation (Section 15)
 */
const createConsultation = async (req, res, next) => {
  try {
    const { encounter_id, encounterId, symptoms, clinical_notes, follow_up } = req.body;
    const encId = encounter_id || encounterId;

    if (!encId || !symptoms) {
      return res.status(400).json({ success: false, message: 'Encounter ID and Symptoms are required.' });
    }

    const doctor = await getDoctorByUserId(req.user.user_id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor record not found.' });
    }

    const [encRows] = await pool.query(
      'SELECT encounter_id, patient_id FROM encounters WHERE encounter_id = ?',
      [encId]
    );
    if (!encRows.length) {
      return res.status(404).json({ success: false, message: 'Encounter not found.' });
    }

    const [result] = await pool.query(
      `INSERT INTO consultations (encounter_id, doctor_id, symptoms, clinical_notes, follow_up)
       VALUES (?, ?, ?, ?, ?)`,
      [encId, doctor.doctor_id, symptoms, clinical_notes || null, follow_up || null]
    );

    const consultationId = result.insertId;

      // Update encounter status to completed
    await pool.query('UPDATE encounters SET status = "completed", queue_status = "completed" WHERE encounter_id = ?', [encId]);

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'doctor',
      action: 'CONSULTATION_CREATED',
      patient_id: encRows[0].patient_id,
      encounter_id: encId,
      resource_type: 'consultation',
      resource_id: consultationId,
      ip_address: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Consultation recorded successfully.',
      data: { consultationId },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctor/consultations/:id
 */
const updateConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { symptoms, clinical_notes, follow_up } = req.body;

    const doctor = await getDoctorByUserId(req.user.user_id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    await pool.query(
      `UPDATE consultations SET
        symptoms = COALESCE(?, symptoms),
        clinical_notes = COALESCE(?, clinical_notes),
        follow_up = COALESCE(?, follow_up),
        updated_at = NOW()
       WHERE consultation_id = ?`,
      [symptoms, clinical_notes, follow_up, id]
    );

    return res.status(200).json({ success: true, message: 'Consultation updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/doctor/diagnoses — add diagnosis (Section 15)
 */
const createDiagnosis = async (req, res, next) => {
  try {
    const { consultation_id, consultationId, diagnosis, icd_code, remarks } = req.body;
    const cId = consultation_id || consultationId;

    if (!cId || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Consultation ID and Diagnosis are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO diagnoses (consultation_id, diagnosis, icd_code, remarks) VALUES (?, ?, ?, ?)',
      [cId, diagnosis, icd_code || null, remarks || null]
    );

    const [enc] = await pool.query(
      'SELECT e.patient_id, c.encounter_id FROM consultations c JOIN encounters e ON c.encounter_id = e.encounter_id WHERE c.consultation_id = ?',
      [cId]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'doctor',
      action: 'DIAGNOSIS_CREATED',
      patient_id: enc[0]?.patient_id,
      encounter_id: enc[0]?.encounter_id,
      resource_type: 'diagnosis',
      resource_id: result.insertId,
      ip_address: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Diagnosis recorded successfully.',
      data: { diagnosisId: result.insertId },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/doctor/prescriptions — write prescription (Section 16)
 */
const createPrescription = async (req, res, next) => {
  try {
    const { consultation_id, consultationId, instructions, items = [] } = req.body;
    const cId = consultation_id || consultationId;

    if (!cId) {
      return res.status(400).json({ success: false, message: 'Consultation ID is required.' });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [prResult] = await conn.query(
        'INSERT INTO prescriptions (consultation_id, instructions) VALUES (?, ?)',
        [cId, instructions || null]
      );
      const prescriptionId = prResult.insertId;

      const validItems = items.filter((it) => it && it.medicine_name && it.medicine_name.trim());

      if (validItems.length > 0) {
        const itemRows = validItems.map((item) => [
          prescriptionId,
          item.medicine_name.trim(),
          item.dosage || null,
          item.frequency || null,
          item.duration || null,
          item.notes || item.instructions || null,
        ]);

        await conn.query(
          `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, notes)
           VALUES ?`,
          [itemRows]
        );
      }

      await conn.commit();
      conn.release();

      const [enc] = await pool.query(
        'SELECT e.patient_id, c.encounter_id FROM consultations c JOIN encounters e ON c.encounter_id = e.encounter_id WHERE c.consultation_id = ?',
        [cId]
      );

      await createAuditLog({
        actor_id: req.user.user_id,
        actor_role: 'doctor',
        action: 'PRESCRIPTION_CREATED',
        patient_id: enc[0]?.patient_id,
        encounter_id: enc[0]?.encounter_id,
        resource_type: 'prescription',
        resource_id: prescriptionId,
        ip_address: req.ip,
      });

      return res.status(201).json({
        success: true,
        message: 'Prescription saved successfully.',
        data: { prescriptionId },
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/patients/:id/history
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [encounters] = await pool.query(
      `SELECT e.*, h.name AS hospital_name,
              u.first_name AS doctor_first, u.last_name AS doctor_last
       FROM encounters e
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors d ON e.doctor_id = d.doctor_id
       LEFT JOIN users u ON d.user_id = u.user_id
       WHERE e.patient_id = ?
       ORDER BY e.visit_date DESC`,
      [id]
    );

    return res.status(200).json({ success: true, data: encounters });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/doctor/encounters/:id/status
 * Allows doctor to start consultation ('in_consultation') or complete it
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
      actor_role: 'doctor',
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

module.exports = {
  getEncounters,
  getClinicalSummary,
  createConsultation,
  updateConsultation,
  createDiagnosis,
  createPrescription,
  getPatientHistory,
  updateEncounterStatus,
};
