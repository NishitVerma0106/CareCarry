const { pool } = require('../src/config/database');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('Running hospital operations schema migration...');

    // 1. Columns for encounters
    const [cols] = await conn.query('SHOW COLUMNS FROM encounters');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('department')) {
      await conn.query("ALTER TABLE encounters ADD COLUMN department VARCHAR(100) DEFAULT 'General Medicine' AFTER visit_type");
      console.log('✅ Added department to encounters');
    }
    if (!colNames.includes('token_number')) {
      await conn.query("ALTER TABLE encounters ADD COLUMN token_number VARCHAR(20) DEFAULT NULL AFTER department");
      console.log('✅ Added token_number to encounters');
    }
    if (!colNames.includes('queue_status')) {
      await conn.query("ALTER TABLE encounters ADD COLUMN queue_status ENUM('waiting', 'in_consultation', 'completed', 'cancelled') DEFAULT 'waiting' AFTER status");
      console.log('✅ Added queue_status to encounters');
    }
    if (!colNames.includes('discharge_summary')) {
      await conn.query("ALTER TABLE encounters ADD COLUMN discharge_summary TEXT DEFAULT NULL");
      console.log('✅ Added discharge_summary to encounters');
    }
    if (!colNames.includes('discharge_date')) {
      await conn.query("ALTER TABLE encounters ADD COLUMN discharge_date DATETIME DEFAULT NULL");
      console.log('✅ Added discharge_date to encounters');
    }

    // 2. Columns for prescription_items
    const [pcols] = await conn.query('SHOW COLUMNS FROM prescription_items');
    const pColNames = pcols.map(c => c.Field);
    if (!pColNames.includes('status')) {
      await conn.query("ALTER TABLE prescription_items ADD COLUMN status ENUM('PENDING', 'DISPENSED') DEFAULT 'PENDING'");
      console.log('✅ Added status to prescription_items');
    }
    if (!pColNames.includes('dispensed_at')) {
      await conn.query("ALTER TABLE prescription_items ADD COLUMN dispensed_at DATETIME DEFAULT NULL");
      console.log('✅ Added dispensed_at to prescription_items');
    }

    // 3. Create lab_orders table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS lab_orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        encounter_id INT NOT NULL,
        patient_id INT NOT NULL,
        hospital_id INT,
        ordered_by INT,
        test_name VARCHAR(255) NOT NULL,
        status ENUM('ORDERED', 'SAMPLE_COLLECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'ORDERED',
        notes TEXT,
        result_report_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
        INDEX idx_enc (encounter_id),
        INDEX idx_pat (patient_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Verified lab_orders table');

    // Populate existing encounters with token numbers if null
    await conn.query(`
      UPDATE encounters 
      SET token_number = CONCAT('TK-', LPAD(encounter_id, 3, '0'))
      WHERE token_number IS NULL
    `);

    // Update queue_status for existing completed encounters
    await conn.query(`
      UPDATE encounters 
      SET queue_status = 'completed'
      WHERE status = 'completed' AND queue_status = 'waiting'
    `);

    console.log('🎉 Migration finished successfully!');
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
