const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const intakeController = require('../controllers/intakeController');
const { authenticatePatientSession } = require('../middleware/auth');

// Configure multer storage for medical documents
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// Intake Question Tree & Responses (Protected by Patient Session)
router.get('/session-case', authenticatePatientSession, intakeController.getSessionCase);
router.post('/answer', authenticatePatientSession, intakeController.submitAnswer);
router.post('/voice-map', intakeController.voiceOptionMap);
router.post('/speech-to-text', intakeController.speechToText);
router.post('/text-to-speech', intakeController.textToSpeech);
router.post('/upload-doc', authenticatePatientSession, upload.single('document'), intakeController.uploadDocument);
router.post('/complete', authenticatePatientSession, intakeController.completeIntake);
router.get('/patient-history', authenticatePatientSession, intakeController.getPatientHistory);

// AI-Powered Inquiry Endpoints
router.post('/ai-inquiry', intakeController.aiInquiry);
router.post('/generate-report', intakeController.generateReport);

// ABHA/ABDM Integration Endpoints
router.post('/verify-abha', intakeController.verifyAbha);
router.get('/abha-history', intakeController.getAbhaHistory);

module.exports = router;
