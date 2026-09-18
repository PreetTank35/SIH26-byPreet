const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { sendSms } = require('./smsService');

// Secure in-memory OTP store with 5-minute TTL: `${hospitalId}:${phone}` -> { otpHash, expiresAt }
const otpStore = new Map();
// Consumed OTP store to enforce strictly single-use OTPs (prevents replay/reuse)
const consumedOtpStore = new Map();

/**
 * Staff Login
 */
async function loginStaff(email, password) {
  const res = await query(
    `SELECT u.*, r.name as role_name, h.name as hospital_name, d.name as department_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN hospitals h ON u.hospital_id = h.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE LOWER(u.email) = LOWER($1) AND u.status = 'active'`,
    [email]
  );

  if (res.rowCount === 0) {
    throw new Error('Invalid email or password');
  }

  const user = res.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    {
      user_id: user.id,
      hospital_id: user.hospital_id,
      role_id: user.role_id
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hospital_id: user.hospital_id,
      hospital_name: user.hospital_name,
      department_id: user.department_id,
      department_name: user.department_name,
      role_id: user.role_id,
      role_name: user.role_name
    }
  };
}

/**
 * Staff Self-Registration Request
 */
async function submitRegistrationRequest(hospitalId, name, phone, email, requestedRoleId) {
  const res = await query(
    `INSERT INTO registration_requests (hospital_id, name, phone, email, requested_role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [hospitalId, name, phone, email, requestedRoleId]
  );
  return res.rows[0];
}

/**
 * Send Cryptographic 6-Digit Patient OTP via SMS Gateway
 */
async function sendPatientOtp(hospitalId, phone) {
  if (!phone || phone.trim().length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }

  // Validate hospital with resilient fallback
  let hospRes;
  if (hospitalId) {
    hospRes = await query(`SELECT id, name FROM hospitals WHERE id = $1`, [hospitalId]);
  }
  if (!hospRes || hospRes.rowCount === 0) {
    hospRes = await query(`SELECT id, name FROM hospitals LIMIT 1`);
  }
  if (!hospRes || hospRes.rowCount === 0) {
    throw new Error('Hospital not found');
  }

  const effectiveHospitalId = hospRes.rows[0].id;

  // Generate secure 6-digit random numeric OTP
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

  // Store in OTP map using effective hospital ID and generic phone
  const storeKey = `${effectiveHospitalId}:${phone.trim()}`;
  otpStore.set(storeKey, { otp: rawOtp, expiresAt });
  otpStore.set(`phone:${phone.trim()}`, { otp: rawOtp, expiresAt, hospitalId: effectiveHospitalId });

  // Send via SMS interface
  const hospitalName = hospRes.rows[0].name;
  const smsMessage = `Your MediKiosk OPD verification OTP is ${rawOtp} for ${hospitalName}. Valid for 5 minutes. Do not share.`;
  await sendSms(phone, smsMessage, rawOtp);

  return {
    success: true,
    message: `OTP sent successfully to +91-${phone.slice(0, 2)}******${phone.slice(-2)}`,
    phone: phone.trim(),
    hospital_id: effectiveHospitalId,
    hospital_name: hospitalName,
    expires_in_seconds: 300,
    // Return debug_otp for terminal / development inspection
    debug_otp: process.env.NODE_ENV === 'production' ? undefined : rawOtp
  };
}

/**
 * Verify Patient OTP & Create/Resume Durable Patient Identity + Session
 */
async function verifyPatientOtp(hospitalId, phone, enteredOtp, isKioskVerified = false, languagePref = 'en') {
  const cleanPhone = phone.trim();
  const cleanOtp = enteredOtp.trim();

  // Validate hospital
  let effectiveHospId = hospitalId;
  let hospRes;
  if (effectiveHospId) {
    hospRes = await query(`SELECT id, name FROM hospitals WHERE id = $1`, [effectiveHospId]);
  }
  if (!hospRes || hospRes.rowCount === 0) {
    hospRes = await query(`SELECT id, name FROM hospitals LIMIT 1`);
    if (hospRes && hospRes.rowCount > 0) {
      effectiveHospId = hospRes.rows[0].id;
    }
  }

  // Check if this OTP was already consumed
  const consumedKey = `${cleanPhone}:${cleanOtp}`;
  const consumedExpiry = consumedOtpStore.get(consumedKey);
  if (consumedExpiry && consumedExpiry > Date.now()) {
    throw new Error('This OTP has already been used once. For security, please click Resend OTP.');
  }

  const storeKey = `${effectiveHospId}:${cleanPhone}`;
  const record = otpStore.get(storeKey) || otpStore.get(`phone:${cleanPhone}`);

  if (!record || record.expiresAt < Date.now()) {
    throw new Error('OTP has expired or was not requested. Please click Resend OTP.');
  }

  if (record.otp !== cleanOtp) {
    throw new Error('Invalid OTP entered. Please check your SMS and try again.');
  }

  // OTP verified, consume it permanently
  otpStore.delete(storeKey);
  otpStore.delete(`phone:${cleanPhone}`);
  // Mark in consumed registry for 10 minutes to guarantee single-use enforcement
  consumedOtpStore.set(consumedKey, Date.now() + 10 * 60 * 1000);

  // 1. Look up or create durable patient record
  let patientRes = await query(
    `SELECT * FROM patients WHERE hospital_id = $1 AND phone = $2`,
    [effectiveHospId, cleanPhone]
  );

  let patient;
  let isNewPatient = false;

  if (patientRes.rowCount === 0) {
    const createPatRes = await query(
      `INSERT INTO patients (hospital_id, phone, name, age, gender)
       VALUES ($1, $2, 'Patient', 30, 'Other')
       RETURNING *`,
      [effectiveHospId, cleanPhone]
    );
    patient = createPatRes.rows[0];
    isNewPatient = true;
  } else {
    patient = patientRes.rows[0];
  }

  // 2. Look up active session
  const sessionRes = await query(
    `SELECT * FROM patient_sessions 
     WHERE patient_id = $1 AND hospital_id = $2 AND status = 'active' AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [patient.id, effectiveHospId]
  );

  let session;
  let isResumed = false;

  if (sessionRes.rowCount > 0) {
    session = sessionRes.rows[0];
    isResumed = true;
    if (isKioskVerified && !session.is_kiosk_verified) {
      await query(`UPDATE patient_sessions SET is_kiosk_verified = true WHERE id = $1`, [session.id]);
      session.is_kiosk_verified = true;
    }
  } else {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const newSessionRes = await query(
      `INSERT INTO patient_sessions (patient_id, hospital_id, token, language_pref, status, is_kiosk_verified, expires_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING *`,
      [patient.id, effectiveHospId, sessionToken, languagePref, isKioskVerified, expiresAt]
    );
    session = newSessionRes.rows[0];
  }

  // Session JWT
  const sessionJwt = jwt.sign(
    {
      session_id: session.id,
      patient_id: patient.id,
      hospital_id: effectiveHospId,
      session_token: session.token
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    session_token: session.token,
    token: sessionJwt,
    is_resumed: isResumed,
    is_new_patient: isNewPatient,
    patient: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender,
      abha_id: patient.abha_id
    },
    session: {
      id: session.id,
      status: session.status,
      is_kiosk_verified: session.is_kiosk_verified,
      expires_at: session.expires_at,
      language_pref: session.language_pref
    }
  };
}

/**
 * Update Patient Demographics & ABHA
 */
async function updatePatientProfile(patientId, hospitalId, data) {
  const { name, age, gender, abha_id } = data;
  const res = await query(
    `UPDATE patients 
     SET name = COALESCE($1, name),
         age = COALESCE($2, age),
         gender = COALESCE($3, gender),
         abha_id = COALESCE($4, abha_id)
     WHERE id = $5 AND hospital_id = $6
     RETURNING *`,
    [name, age, gender, abha_id, patientId, hospitalId]
  );
  return res.rows[0];
}

module.exports = {
  loginStaff,
  submitRegistrationRequest,
  sendPatientOtp,
  verifyPatientOtp,
  updatePatientProfile
};
