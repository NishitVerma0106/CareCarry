const { pool } = require('../config/database');
const { generateQrToken } = require('../utils/generateQrToken');
const { createAuditLog } = require('../middleware/audit');
const { uploadFile } = require('../services/cloudinaryService');

/**
 * Helper to get patient record for current user
 */
const getPatientByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

/**
 * GET /api/patient/me — patient profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
              p.patient_id, p.carecarry_id, p.abha_id, p.abha_status,
              p.date_of_birth, p.gender,
              p.blood_group, p.allergies, p.conditions, p.current_medications,
              p.emergency_notes, p.address, p.city, p.state,
              p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation,
              p.created_at
       FROM users u
       JOIN patients p ON u.user_id = p.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'patient',
      action: 'PATIENT_PROFILE_VIEW',
      patient_id: rows[0].patient_id,
      ip_address: req.ip,
    });

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/patient/me — update patient profile
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      blood_group,
      allergies,
      conditions,
      current_medications,
      emergency_notes,
      address,
      city,
      state,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      await conn.query(
        `UPDATE users SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone)
         WHERE user_id = ?`,
        [first_name, last_name, phone, req.user.user_id]
      );

      await conn.query(
        `UPDATE patients SET
          blood_group = COALESCE(?, blood_group),
          allergies = COALESCE(?, allergies),
          conditions = COALESCE(?, conditions),
          current_medications = COALESCE(?, current_medications),
          emergency_notes = COALESCE(?, emergency_notes),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          emergency_contact_relation = COALESCE(?, emergency_contact_relation)
         WHERE user_id = ?`,
        [
          blood_group,
          allergies,
          conditions,
          current_medications,
          emergency_notes,
          address,
          city,
          state,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relation,
          req.user.user_id,
        ]
      );

      await conn.commit();
      conn.release();

      const [updated] = await pool.query(
        `SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
                p.patient_id, p.carecarry_id, p.date_of_birth, p.gender,
                p.blood_group, p.allergies, p.conditions, p.current_medications,
                p.emergency_notes, p.address, p.city, p.state,
                p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation
         FROM users u JOIN patients p ON u.user_id = p.user_id WHERE u.user_id = ?`,
        [req.user.user_id]
      );

      return res.status(200).json({ success: true, message: 'Profile updated successfully.', data: updated[0] });
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
 * GET /api/patient/carecard OR /api/patient/me/carecarry-id
 */
const getCareCarryId = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.date_of_birth, p.gender, p.blood_group,
              u.first_name, u.last_name, u.email, u.phone
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.user_id = ?`,
      [req.user.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const patient = rows[0];
    const { token, qrDataUrl, expiresAt } = await generateQrToken(patient.patient_id, patient.carecarry_id);

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'patient',
      action: 'QR_GENERATED',
      patient_id: patient.patient_id,
      ip_address: req.ip,
    });

    return res.status(200).json({
      success: true,
      data: {
        carecarryId: patient.carecarry_id,
        name: `${patient.first_name} ${patient.last_name}`,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        bloodGroup: patient.blood_group,
        phone: patient.phone,
        qrDataUrl,
        token,
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/timeline — complete longitudinal medical timeline
 */
const getTimeline = async (req, res, next) => {
  try {
    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    const patientId = patient.patient_id;

    // 1. Get encounters
    const [encounters] = await pool.query(
      `SELECT e.encounter_id, e.visit_date, e.visit_type, e.department, e.token_number,
              e.status, e.queue_status, e.discharge_summary, e.discharge_date, e.notes,
              h.name AS hospital_name, h.city AS hospital_city,
              u.first_name AS doctor_first, u.last_name AS doctor_last,
              d.specialization
       FROM encounters e
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors d ON e.doctor_id = d.doctor_id
       LEFT JOIN users u ON d.user_id = u.user_id
       WHERE e.patient_id = ?
       ORDER BY e.visit_date DESC`,
      [patientId]
    );

    // Build encounter details
    const encounterItems = await Promise.all(
      encounters.map(async (enc) => {
        // Consultations
        const [consultations] = await pool.query(
          `SELECT c.consultation_id, c.symptoms, c.clinical_notes, c.follow_up, c.created_at,
                  d.diagnosis_id, d.diagnosis, d.icd_code, d.remarks,
                  pr.prescription_id, pr.instructions
           FROM consultations c
           LEFT JOIN diagnoses d ON c.consultation_id = d.consultation_id
           LEFT JOIN prescriptions pr ON c.consultation_id = pr.consultation_id
           WHERE c.encounter_id = ?
           ORDER BY c.created_at DESC`,
          [enc.encounter_id]
        );

        // Fetch prescription items for each prescription found
        const consultationsWithItems = await Promise.all(
          consultations.map(async (c) => {
            if (c.prescription_id) {
              const [items] = await pool.query(
                'SELECT item_id, medicine_name, dosage, frequency, duration, notes, status FROM prescription_items WHERE prescription_id = ?',
                [c.prescription_id]
              );
              return { ...c, prescription_items: items };
            }
            return { ...c, prescription_items: [] };
          })
        );

        // Reports linked to encounter
        const [reports] = await pool.query(
          `SELECT report_id, title, document_type, file_name, secure_file_url, uploaded_at, hospital_name, description
           FROM medical_reports
           WHERE encounter_id = ? AND patient_id = ?
           ORDER BY uploaded_at DESC`,
          [enc.encounter_id, patientId]
        );

        // Lab orders linked to encounter
        const [labOrders] = await pool.query(
          `SELECT lo.order_id, lo.test_name, lo.status, lo.notes, mr.secure_file_url, mr.title AS report_title
           FROM lab_orders lo
           LEFT JOIN medical_reports mr ON lo.result_report_id = mr.report_id
           WHERE lo.encounter_id = ?
           ORDER BY lo.created_at DESC`,
          [enc.encounter_id]
        );

        return {
          type: 'encounter',
          id: `enc_${enc.encounter_id}`,
          date: enc.visit_date,
          ...enc,
          consultations: consultationsWithItems,
          reports,
          labOrders,
        };
      })
    );

    // 2. Get standalone patient uploaded reports (not linked to an encounter)
    const [standaloneReports] = await pool.query(
      `SELECT report_id, title, document_type, file_name, secure_file_url, uploaded_at,
              COALESCE(report_date, uploaded_at) AS event_date,
              hospital_name, description
       FROM medical_reports
       WHERE patient_id = ? AND encounter_id IS NULL
       ORDER BY event_date DESC`,
      [patientId]
    );

    const reportItems = standaloneReports.map((r) => ({
      type: 'report',
      id: `rep_${r.report_id}`,
      date: r.event_date,
      report_id: r.report_id,
      title: r.title || r.file_name,
      document_type: r.document_type,
      file_name: r.file_name,
      secure_file_url: r.secure_file_url,
      hospital_name: r.hospital_name || 'Personal Upload',
      description: r.description,
      uploaded_at: r.uploaded_at,
    }));

    // Merge and sort all timeline entries by date descending
    const fullTimeline = [...encounterItems, ...reportItems].sort(
      (a, b) => new Date(b.date || b.visit_date) - new Date(a.date || a.visit_date)
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'patient',
      action: 'TIMELINE_VIEWED',
      patient_id: patientId,
      ip_address: req.ip,
    });

    return res.status(200).json({ success: true, data: fullTimeline });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/patient/reports — patient upload medical report (Section 8)
 */
const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const {
      document_type = 'other',
      title,
      hospital_name,
      report_date,
      description,
      encounter_id,
    } = req.body;

    const reportTitle = title || req.file.originalname;

    // Upload to Cloudinary (with local fallback if credentials not set)
    const cloudResult = await uploadFile(req.file.buffer, {
      originalname: req.file.originalname,
      folder: `carecarry/patients/${patient.carecarry_id}/reports`,
      tags: ['patient_upload', document_type],
    });

    const [result] = await pool.query(
      `INSERT INTO medical_reports
       (patient_id, encounter_id, hospital_id, document_type, title, description,
        report_date, hospital_name, file_name, cloudinary_public_id, secure_file_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.patient_id,
        encounter_id || null,
        null,
        document_type,
        reportTitle,
        description || null,
        report_date || new Date(),
        hospital_name || null,
        req.file.originalname,
        cloudResult.public_id,
        cloudResult.secure_url,
        req.user.user_id,
      ]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'patient',
      action: 'PATIENT_REPORT_UPLOADED',
      patient_id: patient.patient_id,
      resource_type: 'medical_report',
      resource_id: result.insertId,
      ip_address: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Medical report uploaded successfully.',
      data: {
        reportId: result.insertId,
        title: reportTitle,
        documentType: document_type,
        fileName: req.file.originalname,
        secureUrl: cloudResult.secure_url,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/reports — get all reports for current patient
 */
const getMyReports = async (req, res, next) => {
  try {
    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const [reports] = await pool.query(
      `SELECT mr.*,
              u.first_name AS uploader_first, u.last_name AS uploader_last, u.role AS uploader_role,
              h.name AS linked_hospital_name
       FROM medical_reports mr
       LEFT JOIN users u ON mr.uploaded_by = u.user_id
       LEFT JOIN hospitals h ON mr.hospital_id = h.hospital_id
       WHERE mr.patient_id = ?
       ORDER BY mr.uploaded_at DESC`,
      [patient.patient_id]
    );

    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/consultations — get all consultations for current patient
 */
const getMyConsultations = async (req, res, next) => {
  try {
    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const [consultations] = await pool.query(
      `SELECT c.*, e.visit_date, e.visit_type,
              h.name AS hospital_name,
              u.first_name AS doctor_first, u.last_name AS doctor_last,
              d.specialization,
              diag.diagnosis, diag.remarks AS diagnosis_remarks,
              p.instructions AS prescription_instructions
       FROM consultations c
       JOIN encounters e ON c.encounter_id = e.encounter_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors d ON c.doctor_id = d.doctor_id
       LEFT JOIN users u ON d.user_id = u.user_id
       LEFT JOIN diagnoses diag ON c.consultation_id = diag.consultation_id
       LEFT JOIN prescriptions p ON c.consultation_id = p.consultation_id
       WHERE e.patient_id = ?
       ORDER BY c.created_at DESC`,
      [patient.patient_id]
    );

    return res.status(200).json({ success: true, data: consultations });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/prescriptions — get all prescriptions for current patient
 */
const getMyPrescriptions = async (req, res, next) => {
  try {
    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const [prescriptions] = await pool.query(
      `SELECT pr.prescription_id, pr.instructions, pr.created_at,
              c.symptoms, c.clinical_notes,
              e.encounter_id, e.visit_date,
              h.name AS hospital_name,
              u.first_name AS doctor_first, u.last_name AS doctor_last,
              d.specialization,
              diag.diagnosis
       FROM prescriptions pr
       JOIN consultations c ON pr.consultation_id = c.consultation_id
       JOIN encounters e ON c.encounter_id = e.encounter_id
       LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id
       LEFT JOIN doctors d ON c.doctor_id = d.doctor_id
       LEFT JOIN users u ON d.user_id = u.user_id
       LEFT JOIN diagnoses diag ON c.consultation_id = diag.consultation_id
       WHERE e.patient_id = ?
       ORDER BY pr.created_at DESC`,
      [patient.patient_id]
    );

    const fullPrescriptions = await Promise.all(
      prescriptions.map(async (p) => {
        const [items] = await pool.query(
          'SELECT * FROM prescription_items WHERE prescription_id = ?',
          [p.prescription_id]
        );
        return { ...p, items };
      })
    );

    return res.status(200).json({ success: true, data: fullPrescriptions });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/access — get consent grants and audit history
 */
const getAccess = async (req, res, next) => {
  try {
    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const [grants] = await pool.query(
      `SELECT ag.*, u.first_name, u.last_name, u.email, u.role
       FROM access_grants ag
       JOIN users u ON ag.grantee_id = u.user_id
       WHERE ag.patient_id = ?
       ORDER BY ag.requested_at DESC`,
      [patient.patient_id]
    );

    const [auditLogs] = await pool.query(
      `SELECT al.log_id, al.action, al.actor_role, al.created_at,
              u.first_name, u.last_name, al.ip_address
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.user_id
       WHERE al.patient_id = ?
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [patient.patient_id]
    );

    return res.status(200).json({
      success: true,
      data: { grants, auditLogs },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/patient/access/:id — update consent status (approved, rejected, revoked)
 */
const updateConsent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'revoked'

    const patient = await getPatientByUserId(req.user.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    await pool.query(
      'UPDATE access_grants SET status = ?, responded_at = NOW() WHERE grant_id = ? AND patient_id = ?',
      [status, id, patient.patient_id]
    );

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'patient',
      action: `CONSENT_${status.toUpperCase()}`,
      patient_id: patient.patient_id,
      resource_type: 'access_grant',
      resource_id: id,
      ip_address: req.ip,
    });

    return res.status(200).json({ success: true, message: `Consent grant status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getCareCarryId,
  getTimeline,
  uploadReport,
  getMyReports,
  getMyConsultations,
  getMyPrescriptions,
  getAccess,
  updateConsent,
};
