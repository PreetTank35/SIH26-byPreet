const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const { authenticatePatientSession } = require('../middleware/auth');

// List kiosks
router.get('/devices/:hospitalId', kioskController.listKiosks);

// Kiosk Screen: Start initial patient intake session (5-min TTL checkpoint)
router.post('/session/start', kioskController.startSession);

// Check kiosk session status
router.get('/session/:id', kioskController.getSessionStatus);

// Kiosk Screen: generate single-use verification QR code
router.post('/verification-code', kioskController.generateVerificationCode);

// Patient Phone: scan and verify kiosk presence
router.post('/verify-presence', authenticatePatientSession, kioskController.verifyPresence);

module.exports = router;
