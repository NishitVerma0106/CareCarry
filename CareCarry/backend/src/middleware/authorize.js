/**
 * Role-based authorization middleware factory.
 * Usage: authorize('doctor', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Ensure doctor is verified before accessing clinical endpoints
 */
const requireVerifiedDoctor = async (req, res, next) => {
  if (req.user.role !== 'doctor') return next();

  const { pool } = require('../config/database');
  const [rows] = await pool.query(
    'SELECT verification_status FROM doctors WHERE user_id = ?',
    [req.user.user_id]
  );

  if (!rows.length || rows[0].verification_status !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Your doctor account is pending verification by admin.',
    });
  }

  next();
};

/**
 * Ensure hospital staff is verified
 */
const requireVerifiedStaff = async (req, res, next) => {
  if (req.user.role !== 'hospital_staff') return next();

  const { pool } = require('../config/database');
  const [rows] = await pool.query(
    'SELECT hs.verification_status FROM hospital_staff hs WHERE hs.user_id = ?',
    [req.user.user_id]
  );

  if (!rows.length || rows[0].verification_status !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Your hospital staff account is pending verification.',
    });
  }

  next();
};

module.exports = { authorize, requireVerifiedDoctor, requireVerifiedStaff };
