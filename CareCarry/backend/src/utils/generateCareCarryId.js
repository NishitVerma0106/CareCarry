/**
 * Generates a unique CareCarry ID.
 * Format: CC-XXXXXXXXX (alphanumeric, uppercase, 8 chars after CC-)
 * Example: CC-7K3QX9AB
 */
const { pool } = require('../config/database');

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRawId(length = 8) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return `CC-${result}`;
}

async function generateCareCarryId() {
  let id;
  let isUnique = false;

  while (!isUnique) {
    id = generateRawId();
    const [rows] = await pool.query(
      'SELECT carecarry_id FROM patients WHERE carecarry_id = ?',
      [id]
    );
    if (rows.length === 0) {
      isUnique = true;
    }
  }

  return id;
}

module.exports = { generateCareCarryId };
