const { pool } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

/**
 * POST /api/identity/resolve or /api/identity/qr/resolve
 * Resolves a dynamic QR token to patient identity
 */
const resolveQrToken = async (req, res, next) => {
  try {
    const rawVal = req.body.qrToken || req.body.token || req.body.qr_token;
    if (!rawVal) {
      return res.status(400).json({ success: false, message: 'QR token is required.' });
    }

    let token = String(rawVal).trim();
    try {
      const parsed = JSON.parse(token);
      if (parsed.token) token = parsed.token;
    } catch {}

    const [rows] = await pool.query(
      `SELECT qt.patient_id, qt.expires_at,
              p.carecarry_id, p.date_of_birth, p.gender, p.blood_group, p.allergies, p.conditions,
              u.first_name, u.last_name, u.phone
       FROM qr_tokens qt
       JOIN patients p ON qt.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       WHERE qt.token = ?`,
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Invalid or unrecognized QR token.' });
    }

    if (new Date(rows[0].expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'QR token has expired. Please ask the patient to refresh their CareCard QR.',
      });
    }

    const patient = rows[0];

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'QR_RESOLVED',
      patient_id: patient.patient_id,
      ip_address: req.ip,
      extra_data: { method: 'qr_token' },
    });

    const patientData = {
      patientId: patient.patient_id,
      patient_id: patient.patient_id,
      carecarryId: patient.carecarry_id,
      carecarry_id: patient.carecarry_id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      first_name: patient.first_name,
      last_name: patient.last_name,
      fullName: `${patient.first_name} ${patient.last_name}`,
      name: `${patient.first_name} ${patient.last_name}`,
      dateOfBirth: patient.date_of_birth,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      bloodGroup: patient.blood_group,
      blood_group: patient.blood_group,
      allergies: patient.allergies,
      conditions: patient.conditions,
      phone: patient.phone,
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
 * GET /api/identity/resolve/:carecarryId
 * Resolves CareCarry ID directly
 */
const resolveCarecarryId = async (req, res, next) => {
  try {
    const carecarryId = req.params.carecarryId.trim().toUpperCase();

    const [rows] = await pool.query(
      `SELECT p.patient_id, p.carecarry_id, p.date_of_birth, p.gender, p.blood_group,
              p.allergies, p.conditions, u.first_name, u.last_name, u.phone
       FROM patients p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.carecarry_id = ?`,
      [carecarryId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: `Patient with CareCarry ID '${carecarryId}' not found.`,
      });
    }

    const patient = rows[0];

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: req.user.role,
      action: 'PATIENT_IDENTIFIED',
      patient_id: patient.patient_id,
      ip_address: req.ip,
      extra_data: { method: 'carecarry_id' },
    });

    const patientData = {
      patientId: patient.patient_id,
      patient_id: patient.patient_id,
      carecarryId: patient.carecarry_id,
      carecarry_id: patient.carecarry_id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      first_name: patient.first_name,
      last_name: patient.last_name,
      fullName: `${patient.first_name} ${patient.last_name}`,
      name: `${patient.first_name} ${patient.last_name}`,
      dateOfBirth: patient.date_of_birth,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      bloodGroup: patient.blood_group,
      blood_group: patient.blood_group,
      allergies: patient.allergies,
      conditions: patient.conditions,
      phone: patient.phone,
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

module.exports = { resolveQrToken, resolveCarecarryId };
