const { query } = require('../db');
const { completeIntake } = require('./intakeService');

/**
 * Generate single-use Kiosk Verification Code (5-minute TTL)
 */
async function generateVerificationCode(hospitalId, kioskDeviceId = null) {
  let effectiveHospId = hospitalId;
  if (!effectiveHospId) {
    const hospRes = await query(`SELECT id FROM hospitals LIMIT 1`);
    if (hospRes.rowCount > 0) {
      effectiveHospId = hospRes.rows[0].id;
    }
  }

  let activeKioskId = kioskDeviceId;

  // If kioskDeviceId is not provided, look up the first active kiosk for this hospital
  if (!activeKioskId) {
    const kioskRes = await query(
      `SELECT id, location_label FROM kiosk_devices WHERE hospital_id = $1 AND is_active = true LIMIT 1`,
      [effectiveHospId]
    );
    if (kioskRes && kioskRes.rowCount > 0 && kioskRes.rows[0]) {
      activeKioskId = kioskRes.rows[0].id;
    } else {
      // Create a default kiosk device for this hospital
      const newKioskRes = await query(
        `INSERT INTO kiosk_devices (hospital_id, location_label, is_active)
         VALUES ($1, 'Main OPD Reception Kiosk #1', true)
         RETURNING id, location_label`,
        [effectiveHospId]
      );
      activeKioskId = newKioskRes?.rows?.[0]?.id || `kiosk-${Date.now()}`;
    }
  }

  // Generate 4-character clean alphanumeric code (e.g. K-7842)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'K-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const res = await query(
    `INSERT INTO kiosk_verification_codes (kiosk_device_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [activeKioskId, code, expiresAt]
  );

  return {
    code: res.rows[0].code,
    expires_at: res.rows[0].expires_at,
    kiosk_device_id: activeKioskId
  };
}

/**
 * Patient Phone Scans Kiosk Code -> Flips is_kiosk_verified = true
 */
async function verifyKioskPresence(sessionId, code) {
  const cleanCode = code.trim().toUpperCase();

  const codeRes = await query(
    `SELECT * FROM kiosk_verification_codes 
     WHERE code = $1 AND used_at IS NULL AND expires_at > now()`,
    [cleanCode]
  );

  if (codeRes.rowCount === 0) {
    throw new Error('Invalid, expired, or already used kiosk verification code.');
  }

  const codeRecord = codeRes.rows[0];

  // Mark code as used
  await query(
    `UPDATE kiosk_verification_codes SET used_at = now(), session_id = $1 WHERE id = $2`,
    [sessionId, codeRecord.id]
  );

  // Flip session is_kiosk_verified to true
  const sessionRes = await query(
    `UPDATE patient_sessions SET is_kiosk_verified = true WHERE id = $1 RETURNING *`,
    [sessionId]
  );

  // If there is an active intake case for this session, complete queue check-in
  const caseRes = await query(
    `SELECT id FROM cases WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [sessionId]
  );

  let queueResult = null;
  if (caseRes.rowCount > 0) {
    queueResult = await completeIntake(caseRes.rows[0].id);
  }

  return {
    success: true,
    is_kiosk_verified: true,
    message: 'Kiosk presence verified successfully! You have entered the OPD queue.',
    queue_result: queueResult
  };
}

const crypto = require('crypto');

/**
 * Create a new Intake Session checkpoint on Kiosk button click
 * Default TTL: 5 minutes (300 seconds)
 */
async function createIntakeSession(hospitalId = null, kioskDeviceId = null, languagePref = 'hi') {
  let effectiveHospId = hospitalId;
  if (!effectiveHospId) {
    const hospRes = await query(`SELECT id FROM hospitals LIMIT 1`);
    if (hospRes.rowCount > 0) {
      effectiveHospId = hospRes.rows[0].id;
    } else {
      effectiveHospId = 'hosp-0000-0000-0000-0001';
    }
  }

  // 1. Generate verification code
  const verifyData = await generateVerificationCode(effectiveHospId, kioskDeviceId);

  // 2. Create placeholder or guest patient
  const patRes = await query(
    `INSERT INTO patients (hospital_id, full_name, is_guest)
     VALUES ($1, 'Citizen Intake', true)
     RETURNING id`,
    [effectiveHospId]
  );
  const patientId = patRes.rows?.[0]?.id || `pat-${Date.now()}`;

  // 3. Generate session token & 5-minute TTL
  const sessionToken = crypto.randomBytes(24).toString('hex');
  const ttlMinutes = 5;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const newSessionRes = await query(
    `INSERT INTO patient_sessions (patient_id, hospital_id, token, language_pref, status, is_kiosk_verified, expires_at)
     VALUES ($1, $2, $3, $4, 'active', $5, $6)
     RETURNING *`,
    [patientId, effectiveHospId, sessionToken, languagePref, true, expiresAt]
  );

  const session = newSessionRes.rows?.[0] || {
    id: `sess-${Date.now()}`,
    token: sessionToken,
    expires_at: expiresAt,
    status: 'active'
  };

  // 4. Mobile handoff URL
  const mobileHandoffUrl = `/intake?session_id=${session.id}&token=${session.token}&hospital=${encodeURIComponent(effectiveHospId)}&kiosk_code=${verifyData.code}`;

  return {
    success: true,
    session_id: session.id,
    session_token: session.token,
    created_at: new Date().toISOString(),
    expires_at: session.expires_at,
    ttl_seconds: ttlMinutes * 60,
    kiosk_code: verifyData.code,
    hospital_id: effectiveHospId,
    mobile_handoff_url: mobileHandoffUrl
  };
}

/**
 * Get active session status and remaining TTL
 */
async function getSessionStatus(sessionId) {
  const res = await query(
    `SELECT * FROM patient_sessions WHERE id = $1 OR token = $1`,
    [sessionId]
  );

  if (res.rowCount === 0) {
    return { active: false, expired: true, error: 'Session not found' };
  }

  const session = res.rows[0];
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  if (remainingSeconds <= 0 || session.status === 'expired') {
    if (session.status !== 'expired') {
      await query(`UPDATE patient_sessions SET status = 'expired' WHERE id = $1`, [session.id]);
    }
    return {
      active: false,
      expired: true,
      remaining_seconds: 0,
      message: 'Session has expired'
    };
  }

  return {
    active: true,
    expired: false,
    remaining_seconds: remainingSeconds,
    session_id: session.id,
    status: session.status,
    expires_at: session.expires_at
  };
}

module.exports = {
  generateVerificationCode,
  verifyKioskPresence,
  createIntakeSession,
  getSessionStatus
};
