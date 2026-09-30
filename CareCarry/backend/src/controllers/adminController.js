const { pool } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

/**
 * GET /api/admin/doctors/pending (and /api/admin/doctors)
 */
const getPendingDoctors = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const query = status === 'all'
      ? `SELECT d.doctor_id, d.license_number, d.specialization, d.verification_status, d.created_at,
                u.user_id, u.first_name, u.last_name, u.email, u.phone, u.is_active,
                h.name AS hospital_name
         FROM doctors d
         JOIN users u ON d.user_id = u.user_id
         LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
         ORDER BY d.created_at DESC`
      : `SELECT d.doctor_id, d.license_number, d.specialization, d.verification_status, d.created_at,
                u.user_id, u.first_name, u.last_name, u.email, u.phone, u.is_active,
                h.name AS hospital_name
         FROM doctors d
         JOIN users u ON d.user_id = u.user_id
         LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
         WHERE d.verification_status = ?
         ORDER BY d.created_at DESC`;

    const [rows] = await pool.query(query, status === 'all' ? [] : [status]);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/doctors/:id/verify
 */
const verifyDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'verified' } = req.body; // 'verified' | 'rejected' | 'suspended'

    await pool.query(
      'UPDATE doctors SET verification_status = ? WHERE doctor_id = ?',
      [status, id]
    );

    // If suspended or rejected, optionally update user active status
    if (status === 'suspended') {
      const [d] = await pool.query('SELECT user_id FROM doctors WHERE doctor_id = ?', [id]);
      if (d.length) await pool.query('UPDATE users SET is_active = 0 WHERE user_id = ?', [d[0].user_id]);
    } else if (status === 'verified') {
      const [d] = await pool.query('SELECT user_id FROM doctors WHERE doctor_id = ?', [id]);
      if (d.length) await pool.query('UPDATE users SET is_active = 1 WHERE user_id = ?', [d[0].user_id]);
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'admin',
      action: `DOCTOR_${status.toUpperCase()}`,
      resource_type: 'doctor',
      resource_id: id,
      ip_address: req.ip,
    });

    return res.status(200).json({ success: true, message: `Doctor status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/doctors/:id/suspend
 */
const suspendDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    req.body.status = 'suspended';
    return verifyDoctor(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/hospitals/pending (and /api/admin/hospitals)
 */
const getPendingHospitals = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const query = status === 'all'
      ? `SELECT h.*, COUNT(hs.staff_id) AS staff_count
         FROM hospitals h
         LEFT JOIN hospital_staff hs ON h.hospital_id = hs.hospital_id
         GROUP BY h.hospital_id
         ORDER BY h.created_at DESC`
      : `SELECT h.*, COUNT(hs.staff_id) AS staff_count
         FROM hospitals h
         LEFT JOIN hospital_staff hs ON h.hospital_id = hs.hospital_id
         WHERE h.verification_status = ?
         GROUP BY h.hospital_id
         ORDER BY h.created_at DESC`;

    const [rows] = await pool.query(query, status === 'all' ? [] : [status]);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/hospitals/:id/verify
 */
const verifyHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'verified' } = req.body;

    await pool.query('UPDATE hospitals SET verification_status = ? WHERE hospital_id = ?', [status, id]);

    // Also update staff in this hospital
    if (status === 'verified') {
      await pool.query('UPDATE hospital_staff SET verification_status = "verified" WHERE hospital_id = ?', [id]);
    }

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'admin',
      action: `HOSPITAL_${status.toUpperCase()}`,
      resource_type: 'hospital',
      resource_id: id,
      ip_address: req.ip,
    });

    return res.status(200).json({ success: true, message: `Hospital status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, role, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (action) { whereClause += ' AND al.action = ?'; params.push(action); }
    if (role) { whereClause += ' AND al.actor_role = ?'; params.push(role); }

    const [logs] = await pool.query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.user_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs al WHERE ${whereClause}`,
      params
    );

    return res.status(200).json({ success: true, data: { logs, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/statistics
 */
const getStatistics = async (req, res, next) => {
  try {
    const [[patients]] = await pool.query('SELECT COUNT(*) AS count FROM patients');
    const [[doctors]] = await pool.query('SELECT COUNT(*) AS count FROM doctors');
    const [[hospitals]] = await pool.query('SELECT COUNT(*) AS count FROM hospitals');
    const [[encounters]] = await pool.query('SELECT COUNT(*) AS count FROM encounters');
    const [[pendingDoctors]] = await pool.query("SELECT COUNT(*) AS count FROM doctors WHERE verification_status = 'pending'");
    const [[pendingHospitals]] = await pool.query("SELECT COUNT(*) AS count FROM hospitals WHERE verification_status = 'pending'");
    const [[reports]] = await pool.query('SELECT COUNT(*) AS count FROM medical_reports');
    const [[auditLogs]] = await pool.query('SELECT COUNT(*) AS count FROM audit_logs');

    return res.status(200).json({
      success: true,
      data: {
        totalPatients: patients.count,
        totalDoctors: doctors.count,
        totalHospitals: hospitals.count,
        totalEncounters: encounters.count,
        pendingDoctors: pendingDoctors.count,
        pendingHospitals: pendingHospitals.count,
        totalReports: reports.count,
        totalAuditLogs: auditLogs.count,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = '1=1';
    const params = [];
    if (role) { where += ' AND u.role = ?'; params.push(role); }

    const [users] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.created_at,
              p.carecarry_id,
              d.license_number, d.specialization, d.verification_status AS doctor_status,
              hs.staff_role, hs.verification_status AS staff_status
       FROM users u
       LEFT JOIN patients p ON u.user_id = p.user_id
       LEFT JOIN doctors d ON u.user_id = d.user_id
       LEFT JOIN hospital_staff hs ON u.user_id = hs.user_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/status (and toggle-active)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, is_active } = req.body;

    let newActive;
    if (status !== undefined) {
      newActive = status === 'active' || status === 1 || status === true ? 1 : 0;
    } else if (is_active !== undefined) {
      newActive = is_active ? 1 : 0;
    } else {
      // Toggle
      const [u] = await pool.query('SELECT is_active FROM users WHERE user_id = ?', [id]);
      if (!u.length) return res.status(404).json({ success: false, message: 'User not found.' });
      newActive = u[0].is_active ? 0 : 1;
    }

    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [newActive, id]);

    await createAuditLog({
      actor_id: req.user.user_id,
      actor_role: 'admin',
      action: newActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      resource_type: 'user',
      resource_id: id,
      ip_address: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `User ${newActive ? 'activated' : 'suspended'} successfully.`,
      data: { is_active: newActive },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingDoctors,
  verifyDoctor,
  suspendDoctor,
  getPendingHospitals,
  verifyHospital,
  getAuditLogs,
  getStatistics,
  getAllUsers,
  updateUserStatus,
};
