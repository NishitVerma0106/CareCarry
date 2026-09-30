const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { generateCareCarryId } = require('../utils/generateCareCarryId');
const { generateQrToken } = require('../utils/generateQrToken');
const { createAuditLog } = require('../middleware/audit');

/**
 * POST /api/auth/register
 * Supports patient, doctor, hospital_staff
 */
const register = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      fullName,
      email,
      password,
      role = 'patient',
      phone,
      mobile,
      date_of_birth,
      gender,
      blood_group,
      address,
      city,
      state,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      emergency_contact,
      allergies,
      conditions,
      current_medications,
      emergency_notes,
      license_number,
      specialization,
      hospital_id,
      staff_role,
    } = req.body;

    // Normalize names
    let fName = first_name;
    let lName = last_name;
    if ((!fName || !lName) && fullName) {
      const parts = fullName.trim().split(/\s+/);
      fName = parts[0] || 'User';
      lName = parts.slice(1).join(' ') || 'CareCarry';
    }
    if (!fName) fName = 'Patient';
    if (!lName) lName = 'User';

    const userPhone = phone || mobile || null;

    // Check duplicate email
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Insert user
      const [userResult] = await conn.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [fName, lName, email, password_hash, role, userPhone]
      );
      const userId = userResult.insertId;

      let patientData = null;

      // Role-specific setup
      if (role === 'patient') {
        const carecarryId = await generateCareCarryId();
        const emContactName = emergency_contact_name || emergency_contact || null;
        const emContactPhone = emergency_contact_phone || null;
        const emContactRelation = emergency_contact_relation || null;

        const [pResult] = await conn.query(
          `INSERT INTO patients (
            user_id, carecarry_id, date_of_birth, gender, blood_group,
            address, city, state, emergency_contact_name, emergency_contact_phone,
            emergency_contact_relation, allergies, conditions, current_medications, emergency_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            carecarryId,
            date_of_birth || null,
            gender || null,
            blood_group || null,
            address || null,
            city || null,
            state || null,
            emContactName,
            emContactPhone,
            emContactRelation,
            allergies || null,
            conditions || null,
            current_medications || null,
            emergency_notes || null,
          ]
        );

        const patientId = pResult.insertId;
        patientData = { patientId, carecarryId };
      } else if (role === 'doctor') {
        await conn.query(
          `INSERT INTO doctors (user_id, license_number, specialization, hospital_id, verification_status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [userId, license_number || null, specialization || 'General Medicine', hospital_id || null]
        );
      } else if (role === 'hospital_staff') {
        await conn.query(
          `INSERT INTO hospital_staff (user_id, hospital_id, staff_role, verification_status)
           VALUES (?, ?, ?, 'pending')`,
          [userId, hospital_id || 1, staff_role || 'records_staff']
        );
      }

      await conn.commit();
      conn.release();

      // If patient, generate QR token right away
      let qrInfo = null;
      if (role === 'patient' && patientData) {
        try {
          qrInfo = await generateQrToken(patientData.patientId, patientData.carecarryId);
        } catch (qrErr) {
          console.warn('[QR Gen Warning]:', qrErr.message);
        }
      }

      await createAuditLog({
        actor_id: userId,
        actor_role: role,
        action: 'USER_REGISTERED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      // Issue JWT
      const token = jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.cookie('carecarry_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful.' + (role !== 'patient' ? ' Awaiting admin verification.' : ''),
        data: {
          token,
          user: {
            userId,
            firstName: fName,
            lastName: lName,
            email,
            role,
            carecarryId: patientData?.carecarryId,
            patientId: patientData?.patientId,
          },
          qr: qrInfo,
        },
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
 * POST /api/auth/login
 * Supports Email OR CareCarry ID OR Phone
 */
const login = async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/ID and password.' });
    }

    const [rows] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.password_hash, u.role, u.is_active,
              p.carecarry_id, p.patient_id,
              d.doctor_id, d.verification_status AS doctor_status,
              hs.staff_id, hs.hospital_id, hs.verification_status AS staff_status
       FROM users u
       LEFT JOIN patients p ON u.user_id = p.user_id
       LEFT JOIN doctors d ON u.user_id = d.user_id
       LEFT JOIN hospital_staff hs ON u.user_id = hs.user_id
       WHERE u.email = ? OR p.carecarry_id = ? OR u.phone = ?`,
      [loginId, loginId, loginId]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await createAuditLog({
      actor_id: user.user_id,
      actor_role: user.role,
      action: 'USER_LOGIN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.cookie('carecarry_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          userId: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          carecarryId: user.carecarry_id,
          patientId: user.patient_id,
          doctorId: user.doctor_id,
          doctorStatus: user.doctor_status,
          hospitalId: user.hospital_id,
          staffId: user.staff_id,
          staffStatus: user.staff_status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    res.clearCookie('carecarry_token');
    if (req.user) {
      await createAuditLog({
        actor_id: req.user.user_id,
        actor_role: req.user.role,
        action: 'USER_LOGOUT',
        ip_address: req.ip,
      });
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.phone, u.created_at,
              p.carecarry_id, p.patient_id, p.date_of_birth, p.gender, p.blood_group,
              d.doctor_id, d.license_number, d.specialization, d.verification_status AS doctor_status,
              hs.staff_id, hs.hospital_id, hs.staff_role, hs.verification_status AS staff_status
       FROM users u
       LEFT JOIN patients p ON u.user_id = p.user_id
       LEFT JOIN doctors d ON u.user_id = d.user_id
       LEFT JOIN hospital_staff hs ON u.user_id = hs.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const u = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        userId: u.user_id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        carecarryId: u.carecarry_id,
        patientId: u.patient_id,
        doctorId: u.doctor_id,
        doctorStatus: u.doctor_status,
        hospitalId: u.hospital_id,
        staffId: u.staff_id,
        staffStatus: u.staff_status,
        createdAt: u.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe };
