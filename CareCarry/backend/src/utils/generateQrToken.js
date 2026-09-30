const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

/**
 * Generates a secure QR token for patient identity.
 * The QR encodes a short-lived lookup token — NOT the medical record.
 * Token stored in DB; resolved via /api/identity/resolve
 */
async function generateQrToken(patientId, carecarryId) {
  const token = `QR-${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Upsert qr token for this patient
  await pool.query(
    `INSERT INTO qr_tokens (patient_id, token, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
    [patientId, token, expiresAt]
  );

  // The QR payload is just the token — backend resolves to identity
  const payload = JSON.stringify({ token, carecarryId });
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  return { token, qrDataUrl, expiresAt };
}

module.exports = { generateQrToken };
