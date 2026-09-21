const intakeService = require('../services/intakeService');
const voiceLlmService = require('../services/voiceLlmService');
const ocrService = require('../services/ocrService');
const prescriptionService = require('../services/prescriptionService');
const bhashiniService = require('../services/bhashiniService');
const aiInquiryService = require('../services/aiInquiryService');
const abhaMockService = require('../services/abhaMockService');
const { query } = require('../db');

/**
 * GET /api/intake/session-case
 */
async function getSessionCase(req, res) {
  try {
    const sessionId = req.patientSession.id;
    const hospitalId = req.patientSession.hospital_id;
    const departmentId = req.query.department_id || null;

    const result = await intakeService.getOrStartCase(sessionId, hospitalId, departmentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/answer
 */
async function submitAnswer(req, res) {
  try {
    const { case_id, question_id, answer_text, answer_type, extracted_via_llm } = req.body;
    if (!case_id || !question_id || !answer_text) {
      return res.status(400).json({ error: 'case_id, question_id, and answer_text are required' });
    }

    const result = await intakeService.submitAnswer(
      case_id,
      question_id,
      answer_text,
      answer_type || 'touch',
      Boolean(extracted_via_llm)
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/voice-map
 * Constrained option mapping
 */
async function voiceOptionMap(req, res) {
  try {
    const { transcript, valid_options, language } = req.body;
    if (!transcript || !valid_options) {
      return res.status(400).json({ error: 'transcript and valid_options required' });
    }

    // Try AI-powered mapping first, fallback to keyword matching
    let result;
    try {
      result = await aiInquiryService.aiMapTranscriptToOption(transcript, valid_options, language || 'en');
    } catch {
      result = await voiceLlmService.mapTranscriptToOption(transcript, valid_options, language || 'en');
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/speech-to-text
 * Bhashini ASR endpoint
 */
async function speechToText(req, res) {
  try {
    const { audio_base64, language, audio_format } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ error: 'audio_base64 payload is required' });
    }
    const transcript = await bhashiniService.speechToText(audio_base64, language || 'hi', audio_format || 'wav');
    console.log(`[Bhashini ASR] Language: ${language || 'hi'} | Result: "${transcript}"`);
    res.json({ transcript, provider: 'bhashini' });
  } catch (err) {
    console.warn('[Bhashini ASR] Error:', err.message);
    res.json({ transcript: null, provider: 'fallback', message: err.message });
  }
}

/**
 * POST /api/intake/text-to-speech
 * Bhashini TTS endpoint
 */
async function textToSpeech(req, res) {
  try {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const audioContent = await bhashiniService.textToSpeech(text, language || 'hi');
    res.json({ audio_base64: audioContent, provider: 'bhashini' });
  } catch (err) {
    res.json({ audio_base64: null, provider: 'fallback', message: err.message });
  }
}

/**
 * POST /api/intake/ai-inquiry
 * AI-powered clinical inquiry — generates next question or follow-up
 * Accepts optional document_context (OCR texts from uploaded docs) for context-aware questioning
 */
async function aiInquiry(req, res) {
  try {
    const { conversation_history, language, document_context } = req.body;

    let result;
    if (!conversation_history || conversation_history.length === 0) {
      // First question
      result = await aiInquiryService.generateFirstQuestion(language || 'en');
    } else {
      // Follow-up question — pass document context if available
      result = await aiInquiryService.generateFollowUpQuestion(
        conversation_history,
        language || 'en',
        document_context || []
      );
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/generate-report
 * Generate a concise clinical report from AI inquiry + ABHA history
 */
async function generateReport(req, res) {
  try {
    const { conversation_history, patient_info, abha_number, case_id, ocr_texts } = req.body;

    // Fetch mock ABHA history
    let medicalHistory = [];
    if (abha_number) {
      const abhaData = await abhaMockService.fetchAbhaHistory(abha_number);
      medicalHistory = abhaData.records || [];
    }

    // Generate clinical report via AI (with optional OCR texts from uploaded docs)
    const report = await aiInquiryService.generateClinicalReport(
      conversation_history || [],
      patient_info || {},
      medicalHistory,
      'en',
      ocr_texts || []
    );

    // Save report and Q&A transcript onto the case if case_id provided
    if (case_id) {
      const chiefComplaint = report.chief_complaint || 'AI Clinical Intake';
      await query(
        `UPDATE cases 
         SET chief_complaint = $1, 
             clinical_report = $2 
         WHERE id = $3`,
        [chiefComplaint, JSON.stringify(report), case_id]
      );

      // Save Q&A pairs into case_responses for doctor transcript
      if (Array.isArray(conversation_history) && conversation_history.length > 0) {
        for (let i = 0; i < conversation_history.length; i++) {
          const entry = conversation_history[i];
          try {
            await query(
              `INSERT INTO case_responses (case_id, question_id, answer_text, answer_type, extracted_via_llm)
               VALUES ($1, $2, $3, $4, $5)`,
              [case_id, `ai_q_${i + 1}`, `${entry.question} -> ${entry.answer}`, 'ai_inquiry', true]
            );
          } catch {}
        }
      }
    }

    res.json({
      report,
      medical_history: medicalHistory,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/verify-abha
 * Verify ABHA identifier (number/address/mobile) — returns linked phone for OTP
 */
async function verifyAbha(req, res) {
  try {
    const { identifier, identifier_type } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'ABHA identifier is required' });
    }

    const result = await abhaMockService.verifyAbhaIdentifier(identifier, identifier_type || 'mobile');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/intake/abha-history
 * Fetch patient medical history from ABDM (mock)
 */
async function getAbhaHistory(req, res) {
  try {
    const abhaNumber = req.query.abha_number;
    if (!abhaNumber) {
      return res.status(400).json({ error: 'abha_number query parameter is required' });
    }

    const history = await abhaMockService.fetchAbhaHistory(abhaNumber);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/upload-doc
 */
async function uploadDocument(req, res) {
  try {
    const { case_id, doc_type } = req.body;
    const sessionId = req.patientSession ? req.patientSession.id : null;
    const uploadedBy = req.user ? req.user.id : null;

    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const doc = await ocrService.processDocument(case_id, sessionId, req.file, doc_type || 'report', uploadedBy);
    res.json({ message: 'Document uploaded and OCR extracted', document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/complete
 */
async function completeIntake(req, res) {
  try {
    const { case_id } = req.body;
    if (!case_id) {
      return res.status(400).json({ error: 'case_id is required' });
    }

    const result = await intakeService.completeIntake(case_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/intake/patient-history
 */
async function getPatientHistory(req, res) {
  try {
    const patientId = req.patient.id;
    const hospitalId = req.patient.hospital_id;
    const history = await prescriptionService.getPatientHistory(patientId, hospitalId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/translate
 * Translation endpoint via MeitY Bhashini NMT
 */
async function translateText(req, res) {
  try {
    const { text, source_language, target_language } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const translated = await bhashiniService.translateText(text, source_language || 'en', target_language || 'hi');
    res.json({ translated_text: translated, provider: 'bhashini' });
  } catch (err) {
    res.json({ translated_text: req.body?.text || '', provider: 'fallback', message: err.message });
  }
}

/**
 * POST /api/intake/transliterate
 * Phonetic transliteration endpoint for Indic names
 */
async function transliterateText(req, res) {
  try {
    const { text, target_language } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const transliterated = await bhashiniService.transliterateText(text, target_language || 'hi');
    res.json({ transliterated_text: transliterated });
  } catch (err) {
    res.json({ transliterated_text: req.body?.text || '', error: err.message });
  }
}

module.exports = {
  getSessionCase,
  submitAnswer,
  voiceOptionMap,
  speechToText,
  textToSpeech,
  translateText,
  transliterateText,
  aiInquiry,
  generateReport,
  verifyAbha,
  getAbhaHistory,
  uploadDocument,
  completeIntake,
  getPatientHistory
};
