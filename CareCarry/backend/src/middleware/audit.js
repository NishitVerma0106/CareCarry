const { pool } = require('../config/database');

/**
 * Audit logging middleware factory.
 * Creates an audit record for the specified action.
 *
 * Usage: auditLog('CONSULTATION_CREATED')
 * Place AFTER the route handler to capture response data, or inline in controllers.
 */
const auditLog = (action, getDetails = () => ({})) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Log after response is determined
      if (res.statusCode < 400) {
        try {
          const details = getDetails(req, body);
          await createAuditLog({
            actor_id: req.user?.user_id || null,
            actor_role: req.user?.role || 'anonymous',
            action,
            patient_id: details.patient_id || req.params.patientId || null,
            encounter_id: details.encounter_id || req.params.encounterId || null,
            resource_type: details.resource_type || null,
            resource_id: details.resource_id || null,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
            extra_data: details.extra || null,
          });
        } catch (err) {
          console.error('[Audit] Failed to write audit log:', err.message);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Direct audit log writer — use inside controllers for granular control.
 */
const createAuditLog = async ({
  actor_id,
  actor_role,
  action,
  patient_id = null,
  encounter_id = null,
  resource_type = null,
  resource_id = null,
  ip_address = null,
  user_agent = null,
  extra_data = null,
}) => {
  await pool.query(
    `INSERT INTO audit_logs 
     (actor_id, actor_role, action, patient_id, encounter_id, resource_type, resource_id, ip_address, user_agent, extra_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actor_id,
      actor_role,
      action,
      patient_id,
      encounter_id,
      resource_type,
      resource_id,
      ip_address,
      user_agent,
      extra_data ? JSON.stringify(extra_data) : null,
    ]
  );
};

module.exports = { auditLog, createAuditLog };
