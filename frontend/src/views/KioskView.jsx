import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Tablet, Mic, MicOff, ArrowRight, CheckCircle2, QrCode, 
  User, Phone, FileText, RefreshCw, AlertCircle, HeartPulse, 
  Smartphone, Sparkles, Building2, Volume2, Printer, ShieldCheck,
  ChevronRight, ArrowLeft, Send, Bot, UserCircle, Stethoscope,
  ClipboardList, Activity, MessageCircle, Hash, AtSign, PhoneCall, X,
  Upload, FileUp, Shield, Zap, Clock, Bell
} from 'lucide-react';
import { speakText, stopAllSpeech, playAssistantSpeech, startSpeechRecognition } from '../utils/speechHelper';
import { WavRecorder, blobToBase64 } from '../utils/wavRecorder';
import OpdReceiptSlip from '../components/OpdReceiptSlip';
import AbhaCardModal from '../components/AbhaCardModal';
import LoginMethodSelector from '../components/common/LoginMethodSelector';
import LoginForm from '../components/common/LoginForm';
import OtpInputBox from '../components/common/OtpInputBox';
import NamasteIcon from '../components/common/NamasteIcon';
import GovStepIndicator from '../components/common/GovStepIndicator';
import patientIntakeIcon from '../assets/patient-intake-icon.png';
import opdHeroIcon from '../assets/opd-hero-icon.png';
import ScrollableContentArea from '../components/common/ScrollableContentArea';
import '../styles/kiosk.css';

export default function KioskView() {
  const { hospitals, selectedHospitalId, selectHospital, verifyPatientOtp, patientToken, patientSession, logoutPatient } = useAuth();
  const { yourTurnEvent, subscribeToCase, triggerSync } = useWebSocket();

  // Kiosk Steps: 'idle' | 'abha_login' | 'otp_verify' | 'consent' | 'doc_upload' | 'ai_inquiry' | 'report' | 'completed'
  const [step, setStep] = useState('idle');
  const { language, setLanguage, translate } = useLanguage();
  const currentLang = language;
  const setCurrentLang = setLanguage;

  // Kiosk Auth Method & Mobile Input
  const [kioskAuthMethod, setKioskAuthMethod] = useState(null); // 'abha' | 'mobile' | null
  const [kioskPhoneInput, setKioskPhoneInput] = useState('');
  const [showWhatIsAbha, setShowWhatIsAbha] = useState(false);

  // ABHA Login
  const [abhaInput, setAbhaInput] = useState('');
  const [abhaMode, setAbhaMode] = useState('mobile'); // 'abha_number' | 'abha_address' | 'mobile'
  const [abhaProfile, setAbhaProfile] = useState(null);
  const [linkedPhone, setLinkedPhone] = useState('');

  // Minimalist ABHA format detector
  const getAbhaInputType = (val) => {
    const clean = (val || '').trim();
    if (!clean) return null;
    if (clean.includes('@')) return 'address';
    const digits = clean.replace(/\D/g, '');
    if (digits.length > 10) return 'abha_number';
    if (digits.length > 0) return 'mobile';
    return 'address';
  };

  // OTP
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sessionToken, setSessionToken] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState(300);
  const [sessionStarting, setSessionStarting] = useState(false);

  // AI Inquiry State
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const chatEndRef = useRef(null);
  const wavRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const stopTimeoutRef = useRef(null);

  // Report & Completion
  const [clinicalReport, setClinicReport] = useState(null);
  const [issuedToken, setIssuedToken] = useState(null);
  const [caseData, setCaseData] = useState(null);

  // Consent
  const [consentGiven, setConsentGiven] = useState(false);

  // Document Upload
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Modals
  const [showReceiptSlip, setShowReceiptSlip] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);

  // LAN & ngrok Network Info for Mobile QR Code
  const [networkHost, setNetworkHost] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [customTunnelInput, setCustomTunnelInput] = useState('');
  const [showTunnelSettings, setShowTunnelSettings] = useState(false);
  const [refreshingTunnel, setRefreshingTunnel] = useState(false);
  const [tunnelSavedNotice, setTunnelSavedNotice] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [platformChoiceMode, setPlatformChoiceMode] = useState('choose'); // 'choose' | 'mobile_qr'

  const fetchNetworkInfo = async () => {
    try {
      const info = await api.get('/system/network-info');
      if (info) {
        setNetworkInfo(info);
        if (info.recommendedMobileBaseUrl) {
          setNetworkHost(info.recommendedMobileBaseUrl);
          if (info.tunnelUrl && !customTunnelInput) {
            setCustomTunnelInput(info.tunnelUrl);
          }
        } else if (info.localIp) {
          setNetworkHost(`http://${info.localIp}:${info.clientPort || 5173}`);
        }
      }
    } catch (err) {
      console.warn('[Network Info Fetch] Error:', err);
    }
  };

  useEffect(() => {
    const savedCustomTunnel = localStorage.getItem('medikiosk_custom_tunnel_url');
    if (savedCustomTunnel) {
      setCustomTunnelInput(savedCustomTunnel);
      api.post('/system/tunnel-url', { url: savedCustomTunnel })
        .then(() => fetchNetworkInfo())
        .catch(() => fetchNetworkInfo());
    } else {
      fetchNetworkInfo();
    }
  }, []);

  const handleRefreshNetworkInfo = async () => {
    setRefreshingTunnel(true);
    await fetchNetworkInfo();
    setRefreshingTunnel(false);
  };

  const handleSaveCustomTunnel = async (url) => {
    try {
      const trimmed = (url || '').trim();
      if (trimmed) {
        localStorage.setItem('medikiosk_custom_tunnel_url', trimmed);
      } else {
        localStorage.removeItem('medikiosk_custom_tunnel_url');
      }
      await api.post('/system/tunnel-url', { url: trimmed });
      setTunnelSavedNotice(trimmed ? (language === 'hi' ? 'टनल URL सहेजा गया' : 'Tunnel URL saved') : (language === 'hi' ? 'रीसेट सफल' : 'Reset to auto-detect'));
      setTimeout(() => setTunnelSavedNotice(null), 3000);
      await fetchNetworkInfo();
    } catch (err) {
      console.warn('[Save Tunnel] Error:', err);
    }
  };

  const handleCopyMobileUrl = () => {
    try {
      navigator.clipboard.writeText(mobileIntakeUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Auto-silence voice assistant whenever user navigates away from AI inquiry step or unmounts
  useEffect(() => {
    if (step !== 'ai_inquiry') {
      stopAllSpeech();
      if (wavRecorderRef.current) {
        try { wavRecorderRef.current.stop(); } catch {}
        wavRecorderRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
        speechRecognitionRef.current = null;
      }
      setIsRecording(false);
    }

    return () => {
      stopAllSpeech();
      if (wavRecorderRef.current) {
        try { wavRecorderRef.current.stop(); } catch {}
        wavRecorderRef.current = null;
      }
    };
  }, [step]);

  const currentHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  // Dynamic Centralized Translations for Kiosk
  const t = useMemo(() => ({
    welcome: translate('OPD Smart Intake Terminal'),
    sub: translate('Touch screen to begin check-in'),
    start_btn: translate('Start Patient Intake'),
    platform_title: translate('How would you like to proceed?'),
    platform_kiosk: translate('Continue on this Kiosk'),
    platform_kiosk_desc: translate('Complete your symptom screening directly on this large touch screen terminal'),
    platform_phone: translate('Continue on your Mobile Phone'),
    platform_phone_desc: translate('Scan QR code and complete the process comfortably on your personal smartphone'),
    abha_login_title: translate('Patient Identity Verification'),
    abha_login_sub: translate('Enter your ABHA ID or mobile number to verify and begin check-in.'),
    abha_mode_number: translate('ABHA Number'),
    abha_mode_address: translate('ABHA Address'),
    abha_mode_mobile: translate('Using Mobile Number'),
    verify_identity: translate('Proceed'),
    otp_title: translate('OTP Verification'),
    otp_sub: translate('Enter the 6-digit code sent to your mobile'),
    verify_otp: translate('Verify OTP & Start'),
    inquiry_title: translate('AI-Assisted Symptom Inquiry'),
    inquiry_sub: translate('Answer the questions below. You can speak, type, or tap an option.'),
    voice_record: translate('Press to Speak'),
    voice_listening: translate('Listening...'),
    type_placeholder: translate('Type your answer here...'),
    send_btn: translate('Send'),
    report_title: translate('Clinical Intake Report'),
    report_sub: translate('Your symptom assessment has been analyzed. Review your report below.'),
    join_queue: translate('Join OPD Queue'),
    token_issued: translate('Your OPD Token Number'),
    intake_done: translate('Intake Successfully Completed!'),
    proceed_msg: translate('token_waiting_notice')
  }), [translate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestion]);

  // Smooth scroll to top on step transition so each screen begins from the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Subscribe to WebSocket case room for live queue updates
  useEffect(() => {
    if (caseData?.id) {
      subscribeToCase(caseData.id);
    }
  }, [caseData?.id]);

  // ===== ABHA VERIFICATION -> SENDS OTP DIRECTLY FOR KIOSK =====
  const handleAbhaVerify = async () => {
    if (!abhaInput || abhaInput.trim().length < 3) {
      setError(translate('Please enter a valid ABHA Number, ABHA Address, or Mobile Number'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/intake/verify-abha', {
        identifier: abhaInput.trim(),
        identifier_type: 'auto'
      });
      setAbhaProfile(res.profile);
      const phoneToSend = res.linked_phone || res.profile?.phone || abhaInput.replace(/\D/g, '').slice(-10);
      setLinkedPhone(phoneToSend);

      // Send OTP immediately for Kiosk check-in
      const otpRes = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone: phoneToSend
      });
      setOtpSent(true);
      setOtpNotice(otpRes.message);
      if (otpRes.debug_otp) {
        console.log(`[MediKiosk OTP]: ${otpRes.debug_otp}`);
      }
      setStep('otp_verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== MOBILE VERIFICATION FOR KIOSK -> SENDS OTP DIRECTLY =====
  const handleKioskMobileVerify = async () => {
    const clean = (kioskPhoneInput || '').replace(/\D/g, '');
    if (clean.length !== 10) {
      setError(translate('Please enter a 10-digit mobile number'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/intake/verify-abha', {
        identifier: clean,
        identifier_type: 'mobile'
      });
      setAbhaInput(clean);
      setAbhaProfile(res.profile);
      const phoneToSend = res.linked_phone || res.profile?.phone || clean;
      setLinkedPhone(phoneToSend);

      // Send OTP immediately for Kiosk check-in
      const otpRes = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone: phoneToSend
      });
      setOtpSent(true);
      setOtpNotice(otpRes.message);
      if (otpRes.debug_otp) {
        console.log(`[MediKiosk OTP]: ${otpRes.debug_otp}`);
      }
      setStep('otp_verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== OTP VERIFICATION — goes to consent =====
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP received on your phone');
      return;
    }
    const enteredOtp = otp;
    setOtp(''); // Enforce single-use on frontend
    setError(null);
    setLoading(true);
    try {
      const phone = linkedPhone || abhaInput.replace(/\D/g, '').slice(-10);
      const res = await verifyPatientOtp(phone, enteredOtp, true, currentLang);
      setSessionToken(res.session_token);

      // Update patient profile with ABHA info if available
      if (abhaProfile && res.token) {
        try {
          await api.put('/auth/patient/profile', {
            name: abhaProfile.name,
            age: abhaProfile.age,
            gender: abhaProfile.gender,
            abha_id: abhaProfile.abha_number
          }, res.token);
        } catch {}
      }

      // Go to consent screen (instead of directly to AI inquiry)
      setStep('consent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== CONSENT → Doc Upload (reordered flow) =====
  const handleConsentAgree = async () => {
    setConsentGiven(true);
    // Go to doc upload FIRST, then AI inquiry
    setStep('doc_upload');
  };

  // ===== AI INQUIRY (starts after doc upload) =====
  const startAiInquiry = async () => {
    setLoading(true);
    try {
      const docContext = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
      const firstQ = await api.post('/intake/ai-inquiry', {
        conversation_history: [],
        language: currentLang,
        document_context: docContext
      });
      setCurrentQuestion(firstQ);
      setStep('ai_inquiry');
      // Speak the first question
      speakQuestionViaBhashini(firstQ);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle option tap
  const handleOptionSelect = async (optionId, optionLabel) => {
    if (!currentQuestion) return;
    stopAllSpeech();
    const answerText = optionLabel?.[currentLang] || optionLabel?.en || optionId;
    await processAnswer(answerText);
  };

  // Handle text input submit
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    stopAllSpeech();
    await processAnswer(textInput.trim());
    setTextInput('');
  };

  // Process any answer (text, voice, or touch)
  const processAnswer = async (answerText) => {
    if (!currentQuestion) return;
    stopAllSpeech();
    setLoading(true);
    setError(null);

    const questionText = currentQuestion.question?.[currentLang] || currentQuestion.question?.en || '';
    const newHistory = [...conversationHistory, {
      question: questionText,
      answer: answerText,
      question_id: currentQuestion.id
    }];
    setConversationHistory(newHistory);

    // Also store in backend case_responses if we have a case
    if (caseData && patientToken) {
      try {
        await api.post('/intake/answer', {
          case_id: caseData.id,
          question_id: currentQuestion.id,
          answer_text: answerText,
          answer_type: 'touch'
        }, patientToken);
      } catch {}
    }

    try {
      // Pass document OCR context to AI for context-aware follow-up questions
      const docContext = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
      const nextQ = await api.post('/intake/ai-inquiry', {
        conversation_history: newHistory,
        language: currentLang,
        document_context: docContext
      });

      if (nextQ.is_terminal) {
        stopAllSpeech();
        setCurrentQuestion(null);
        // AI inquiry complete → generate report directly (docs already uploaded)
        const ocrTexts = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
        await generateClinicalReport(newHistory, ocrTexts);
      } else {
        setCurrentQuestion(nextQ);
        // Instant low-latency voice speaking
        speakQuestionViaBhashini(nextQ);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== ASSISTANT QUESTION VOICE =====
  const speakQuestionViaBhashini = (question) => {
    if (!question?.question) return;
    const textToSpeak = question.question[currentLang] || question.question.en;
    // Instant, zero-latency speech synthesis with lifecycle cancellation
    playAssistantSpeech(textToSpeak, currentLang);
  };

  // ===== HIGH-PRECISION DUAL-ENGINE VOICE INPUT (BHASHINI ASR + LIVE BROWSER SPEECH) =====
  const stopVoiceRecording = async () => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    setIsRecording(false);

    // Stop browser recognition if active
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }

    // Stop WAV recorder and fetch 16kHz PCM WAV audio
    let wavBlob = null;
    if (wavRecorderRef.current) {
      try {
        wavBlob = await wavRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Voice] WavRecorder stop error:', err);
      }
      wavRecorderRef.current = null;
    }

    setVoiceNotice(translate('Processing speech...'));

    let finalTranscript = '';

    // 1. Try Bhashini Dhruva ASR with clean 16kHz WAV
    if (wavBlob && wavBlob.size > 1000) {
      try {
        const base64Audio = await blobToBase64(wavBlob);
        const asrRes = await api.post('/intake/speech-to-text', {
          audio_base64: base64Audio,
          language: currentLang === 'en' ? 'en' : 'hi',
          audio_format: 'wav'
        });
        if (asrRes && asrRes.transcript && asrRes.transcript.trim()) {
          finalTranscript = asrRes.transcript.trim();
        }
      } catch (asrErr) {
        console.warn('[Voice] Bhashini ASR call error:', asrErr.message);
      }
    }

    // 2. Fallback to live browser speech recognition if Bhashini didn't return text
    if (!finalTranscript && liveTranscriptRef.current && liveTranscriptRef.current.trim()) {
      finalTranscript = liveTranscriptRef.current.trim();
    }

    // 3. If transcript found, populate answer and submit
    if (finalTranscript) {
      setVoiceNotice(`"${finalTranscript}"`);
      setTextInput(finalTranscript);

      // If question has options, try AI mapping
      if (currentQuestion && currentQuestion.options && currentQuestion.options.length > 0) {
        try {
          const mapRes = await api.post('/intake/voice-map', {
            transcript: finalTranscript,
            valid_options: currentQuestion.options,
            language: currentLang
          });
          if (mapRes && mapRes.matched_option_id && mapRes.confidence > 0.6) {
            const opt = currentQuestion.options.find(o => o.id === mapRes.matched_option_id);
            await handleOptionSelect(mapRes.matched_option_id, opt?.label);
            return;
          }
        } catch {}
      }

      // Process as free text answer
      await processAnswer(finalTranscript);
      return;
    }

    // 4. If no speech detected at all
    setVoiceNotice(translate('No speech detected. Please speak clearly or type your answer.'));
    setTimeout(() => setVoiceNotice(''), 4000);
  };

  const handleVoiceInput = async () => {
    if (!currentQuestion) return;

    // If currently recording, user tapped to stop & finish
    if (isRecording) {
      await stopVoiceRecording();
      return;
    }

    // Start new recording session
    liveTranscriptRef.current = '';
    setIsRecording(true);
    setVoiceNotice(translate('Listening... Speak now (tap mic when done)'));

    try {
      // 1. Start 16kHz mono WAV recorder
      const recorder = new WavRecorder(16000);
      await recorder.start();
      wavRecorderRef.current = recorder;

      // 2. Concurrently start browser speech recognition as live backup
      try {
        const recognition = startSpeechRecognition({
          lang: currentLang,
          onResult: (transcript) => {
            if (transcript) {
              liveTranscriptRef.current = transcript;
              setVoiceNotice(`"${transcript}"`);
            }
          },
          onError: () => {},
          onEnd: () => {}
        });
        speechRecognitionRef.current = recognition;
      } catch (recErr) {
        console.log('[Voice] Web Speech fallback not supported, relying solely on Bhashini WAV');
      }

      // 3. Auto-stop after 9 seconds if user forgets to tap again
      stopTimeoutRef.current = setTimeout(() => {
        stopVoiceRecording();
      }, 9000);

    } catch (err) {
      setIsRecording(false);
      console.error('[Voice] Mic start error:', err);
      // Fallback directly to browser Speech API if getUserMedia is denied
      setVoiceNotice(translate('Trying browser voice...', 'Trying browser voice...'));
      const recognition = startSpeechRecognition({
        lang: currentLang,
        onResult: async (transcript) => {
          if (transcript) {
            setVoiceNotice(`"${transcript}"`);
            await processAnswer(transcript);
          }
        },
        onError: () => {
          setVoiceNotice(translate('Microphone access denied. Please type your answer.', 'Microphone access denied. Please type your answer.'));
        },
        onEnd: () => setIsRecording(false)
      });
      if (!recognition) {
        setVoiceNotice(translate('Microphone not available. Please type your answer.', 'Microphone not available. Please type your answer.'));
      }
    }
  };

  // ===== REPORT GENERATION =====
  const generateClinicalReport = async (history, ocrTexts = []) => {
    stopAllSpeech();
    setLoading(true);
    setStep('report');
    try {
      // Start a case in the backend for queue
      let myCase = caseData;
      if (patientToken && !myCase) {
        try {
          const caseRes = await api.get('/intake/session-case', patientToken);
          myCase = caseRes.case;
          setCaseData(myCase);
        } catch {}
      }

      const reportRes = await api.post('/intake/generate-report', {
        conversation_history: history,
        patient_info: abhaProfile || { name: 'Patient', age: 30, gender: 'Other' },
        abha_number: abhaProfile?.abha_number || null,
        case_id: myCase?.id || null,
        ocr_texts: ocrTexts
      });
      setClinicReport(reportRes.report);

      // Update case with chief complaint if we have a case
      if (myCase && patientToken && reportRes.report?.chief_complaint) {
        try {
          await api.post('/intake/answer', {
            case_id: myCase.id,
            question_id: 'ai_report_summary',
            answer_text: reportRes.report.chief_complaint,
            answer_type: 'touch'
          }, patientToken);
        } catch {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== DOCUMENT UPLOAD =====
  const handleDocUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('doc_type', 'report');
      if (caseData) formData.append('case_id', caseData.id);
      const res = await api.upload('/intake/upload-doc', formData, patientToken);
      setUploadedDocs(prev => [...prev, res.document]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // After doc upload, start AI inquiry (not report)
  const handleProceedToInquiry = async () => {
    await startAiInquiry();
  };

  // Direct report generation (called after AI inquiry terminal)
  const handleProceedToReport = async () => {
    const ocrTexts = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
    await generateClinicalReport(conversationHistory, ocrTexts);
  };

  // ===== JOIN QUEUE =====
  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      let activePatientToken = patientToken;

      // If patientToken is missing, auto-authenticate with walk-in or demo credentials so a REAL backend token is issued
      if (!activePatientToken) {
        const hospitalId = selectedHospitalId || hospitals[0]?.id || 'hosp-0000-0000-0000-0001';
        const walkinPhone = abhaProfile?.phone || linkedPhone || '9876543210';
        try {
          const otpRes = await api.post('/auth/patient/send-otp', { hospital_id: hospitalId, phone: walkinPhone });
          const authData = await verifyPatientOtp(walkinPhone, otpRes.debug_otp || '123456', true, currentLang);
          activePatientToken = authData.token;
        } catch (authErr) {
          console.log('[Kiosk Walkin Auth Fallback]', authErr.message);
        }
      }

      if (activePatientToken) {
        let myCase = caseData;
        if (!myCase) {
          const caseRes = await api.get('/intake/session-case', activePatientToken);
          myCase = caseRes.case;
          setCaseData(myCase);
        }
        const completeRes = await api.post('/intake/complete', { case_id: myCase.id }, activePatientToken);
        if (completeRes.status === 'queued') {
          setIssuedToken(completeRes.token);
          setStep('completed');
          if (triggerSync) triggerSync();
          return;
        }
      }

      // If backend was completely unreachable, notify user clearly
      throw new Error('Unable to contact OPD hospital database to issue official token.');
    } catch (err) {
      console.error('[Token Generation Error]', err);
      setError(err.message || 'Token generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetKiosk = () => {
    stopAllSpeech();
    if (wavRecorderRef.current) {
      try { wavRecorderRef.current.stop(); } catch {}
      wavRecorderRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
    logoutPatient();
    setStep('idle');
    setAbhaInput('');
    setAbhaMode('mobile');
    setAbhaProfile(null);
    setLinkedPhone('');
    setOtp('');
    setOtpSent(false);
    setOtpNotice(null);
    setCaseData(null);
    setCurrentQuestion(null);
    setConversationHistory([]);
    setClinicReport(null);
    setIssuedToken(null);
    setError(null);
    setTextInput('');
    setConsentGiven(false);
    setUploadedDocs([]);
    setActiveSessionId(null);
    setSessionToken(null);
    setSessionExpiresAt(null);
    setSessionRemainingSeconds(300);
    setSessionStarting(false);
  };

  /**
   * Handle 'Start Patient Intake' Button Click — Checkpoint creating backend session
   * Life: 5 minutes TTL
   */
  const handleStartIntakeSession = async () => {
    setSessionStarting(true);
    setError(null);
    try {
      const res = await api.post('/kiosk/session/start', {
        hospital_id: selectedHospitalId,
        language_pref: language
      });
      if (res && res.session_id) {
        setActiveSessionId(res.session_id);
        setSessionToken(res.session_token);
        const ttlSec = res.ttl_seconds || 300;
        setSessionExpiresAt(Date.now() + ttlSec * 1000);
        setSessionRemainingSeconds(ttlSec);
      } else {
        setSessionExpiresAt(Date.now() + 300 * 1000);
        setSessionRemainingSeconds(300);
      }
      setPlatformChoiceMode('choose');
      setStep('platform_choice');
    } catch (err) {
      console.warn('[Kiosk Session Start] Local fallback:', err.message);
      setSessionExpiresAt(Date.now() + 300 * 1000);
      setSessionRemainingSeconds(300);
      setPlatformChoiceMode('choose');
      setStep('platform_choice');
    } finally {
      setSessionStarting(false);
    }
  };

  // Active Session Countdown Timer (5-minute TTL)
  useEffect(() => {
    if (step === 'idle' || !sessionExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000));
      setSessionRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setError(language === 'hi' ? 'सत्र की समय सीमा समाप्त हो गई है (Inactivity Timeout)। होम स्क्रीन पर पुनः निर्देशित किया जा रहा है।' : 'Intake session expired due to inactivity. Returning to welcome screen.');
        resetKiosk();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, sessionExpiresAt, language]);

  // QR URL for phone continuation (using networkHost so phone on LAN or ngrok can connect)
  const baseUrl = networkHost || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
  const phoneParam = linkedPhone || (abhaInput ? abhaInput.replace(/\D/g, '').slice(-10) : '');
  const mobileIntakeUrl = `${baseUrl}/intake?hospital=${encodeURIComponent(selectedHospitalId || '')}${activeSessionId ? `&session_id=${encodeURIComponent(activeSessionId)}` : ''}${phoneParam ? `&phone=${encodeURIComponent(phoneParam)}&otp_sent=1` : ''}${abhaProfile?.name ? `&name=${encodeURIComponent(abhaProfile.name)}` : ''}${abhaProfile?.abha_number ? `&abha=${encodeURIComponent(abhaProfile.abha_number)}` : ''}${sessionToken ? `&token=${encodeURIComponent(sessionToken)}` : ''}&kiosk=1`;

  return (
    <ScrollableContentArea className={`kiosk-container ${step === 'idle' ? 'idle-mode' : ''}`}>
      {/* Terminal Banner for Active Steps */}
      {step !== 'idle' && (
        <section className="kiosk-terminal-banner" aria-label={translate('Terminal Identification')}>
          <div className="kiosk-terminal-banner-info">
            <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="#FFFFFF" />
            </div>
            <div>
              <h2>{currentHospital?.name || translate('District Civil & AYUSH Hospital')}</h2>
              <p>{translate('OPD Registration & Clinical Case-Taking')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {sessionExpiresAt && (
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '4px 10px', 
                  backgroundColor: sessionRemainingSeconds < 60 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.12)', 
                  border: `1px solid ${sessionRemainingSeconds < 60 ? '#EF4444' : 'rgba(255, 255, 255, 0.25)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: sessionRemainingSeconds < 60 ? '#FCA5A5' : '#FFFFFF'
                }}
                title={language === 'hi' ? 'सक्रिय सत्र का शेष समय' : 'Active Intake Session Remaining Time'}
              >
                <Clock size={14} className={sessionRemainingSeconds < 60 ? 'animate-pulse' : ''} />
                <span>
                  {language === 'hi' ? 'सत्र शेष:' : 'Session:'} {Math.floor(sessionRemainingSeconds / 60)}:{(sessionRemainingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            <button type="button" className="gov-btn gov-btn-outline gov-btn-sm" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'transparent' }} onClick={resetKiosk}>
              <RefreshCw size={13} /> {translate('Reset Kiosk')}
            </button>
          </div>
        </section>
      )}

      {/* Official Government Step Indicator (Form OPD-01) */}
      {step !== 'idle' && step !== 'phone_qr_display' && (
        <GovStepIndicator
          formCode="OPD-01"
          currentStep={
            step === 'abha_login' || step === 'platform_choice' || step === 'otp_verify' ? 1
            : step === 'consent' ? 2
            : step === 'doc_upload' || step === 'ai_inquiry' ? 3
            : 4
          }
          totalSteps={4}
          titleEn={
            step === 'abha_login' || step === 'platform_choice' || step === 'otp_verify' ? 'Personal Details'
            : step === 'consent' ? 'Patient Consent'
            : step === 'doc_upload' || step === 'ai_inquiry' ? 'Symptoms Inquiry'
            : 'OPD Queue Token'
          }
          titleHi={
            step === 'abha_login' || step === 'platform_choice' || step === 'otp_verify' ? 'व्यक्तिगत विवरण'
            : step === 'consent' ? 'रोगी सहमति'
            : step === 'doc_upload' || step === 'ai_inquiry' ? 'लक्षण जांच'
            : 'ओपीडी कतार टोकन'
          }
          steps={[
            { number: 1, labelEn: 'Personal Details', labelHi: 'व्यक्तिगत विवरण' },
            { number: 2, labelEn: 'Consent', labelHi: 'सहमति' },
            { number: 3, labelEn: 'Symptoms', labelHi: 'लक्षण' },
            { number: 4, labelEn: 'Token', labelHi: 'टोकन' }
          ]}
        />
      )}

      {/* Error Banner */}
      {error && (
        <div role="alert" style={{ backgroundColor: 'var(--status-priority-bg)', color: 'var(--status-priority)', border: '1px solid var(--status-priority-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '13.5px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ========== 1. IDLE SCREEN ========== */}
      {step === 'idle' && (
        <div className="kiosk-idle-hero">
          <div style={{ width: '56px', height: '56px', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={opdHeroIcon} alt="OPD Smart Intake" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="kiosk-hero-main-title">{translate('OPD Smart Intake Terminal')}</h1>
          <p className="kiosk-hero-sub-title">{translate('OPD Smart Intake Terminal Sub')}</p>
          <p className="kiosk-hero-caption">
            {translate('Touch screen to begin check-in')}
          </p>
          <div className="kiosk-single-action-wrap" style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '600px', margin: '18px auto 0' }}>
            {/* Single Prominent CTA Button: Start Patient Intake */}
            <div
              role="button"
              tabIndex={0}
              className="kiosk-card-btn primary kiosk-hero-btn-large"
              onClick={sessionStarting ? undefined : handleStartIntakeSession}
              onKeyDown={(e) => { if (!sessionStarting && (e.key === 'Enter' || e.key === ' ')) handleStartIntakeSession(); }}
              style={{
                width: '100%',
                padding: '22px 26px',
                minHeight: '88px',
                cursor: sessionStarting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                borderRadius: '6px',
                boxShadow: '0 4px 16px rgba(11, 31, 58, 0.15)'
              }}
              title="Touch to start patient intake session"
            >
              <div className="kiosk-card-icon-box primary-icon-box" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
                <img src={patientIntakeIcon} alt="Patient Intake" className="kiosk-patient-icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                  {sessionStarting ? (language === 'hi' ? 'सत्र प्रारंभ हो रहा है...' : 'Starting Secure Session...') : translate('Start Patient Intake')}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13.5px', margin: 0, lineHeight: 1.4 }}>
                  {translate('New OPD consultation check-in & queue token')}
                </p>
              </div>
              {sessionStarting ? (
                <RefreshCw size={28} className="spin" color="#FFFFFF" />
              ) : (
                <ChevronRight size={32} color="#FFFFFF" />
              )}
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '11.5px', color: 'var(--gov-text-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Terminal #01</span><span style={{ color: '#CBD5E1' }}>|</span><span>National Health Mission & Ministry of Ayush OPD Gateway</span>
          </div>
        </div>
      )}

      {/* ========== 2. PLATFORM SELECTION (Kiosk vs Mobile Phone) ========== */}
      {step === 'platform_choice' && (
        <>
          {platformChoiceMode === 'choose' ? (
            <div className="kiosk-platform-choice-container">
              {/* Top Navigation */}
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  onClick={() => { setStep('idle'); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={15} /> {translate('Back to Home')}
                </button>
              </div>

              <div className="gov-card" style={{ padding: '28px 24px', border: '1.5px solid var(--gov-border-strong)', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', backgroundColor: 'var(--gov-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse size={28} color="var(--gov-primary)" />
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>
                  {language === 'hi' ? 'पंजीकरण का माध्यम चुनें' : 'Choose Your Intake Platform'}
                </h2>
                <p style={{ color: 'var(--gov-text-muted)', fontSize: '14.5px', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                  {language === 'hi'
                    ? 'क्या आप इस सत्र को इसी कियोस्क पर जारी रखना चाहते हैं, या अपने निजी मोबाइल फोन पर पूरा करना चाहते हैं?'
                    : 'Do you want to continue this session on this Kiosk terminal or on your Mobile phone?'}
                </p>

                <div className="kiosk-platform-grid">
                  {/* Option 1: Continue on this Kiosk Terminal */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="kiosk-platform-card"
                    onClick={() => { setStep('abha_login'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setStep('abha_login'); }}
                  >
                    <div className="platform-card-badge primary">
                      {language === 'hi' ? 'तत्काल टच सेवा' : 'Fast Touch Experience'}
                    </div>
                    <div className="platform-icon-circle primary">
                      <Tablet size={34} color="var(--gov-primary)" />
                    </div>
                    <h3 className="platform-title">
                      {language === 'hi' ? 'कियोस्क टर्मिनल पर जारी रखें' : 'Continue on this Kiosk'}
                    </h3>
                    <p className="platform-desc">
                      {language === 'hi'
                        ? 'बड़ी टच-स्क्रीन, आवाज सहायता (Bhashini AI) और तत्काल प्रिंटेड पर्ची के साथ यहीं पूरा करें।'
                        : 'Complete check-in right here using the large touchscreen, Bhashini AI voice guidance, and instant printed slip.'}
                    </p>
                    <ul className="platform-features">
                      <li>✓ {language === 'hi' ? 'बड़ी टच-स्क्रीन इंटरफ़ेस' : 'Large easy touchscreen'}</li>
                      <li>✓ {language === 'hi' ? 'हिंदी व क्षेत्रीय आवाज़ सहायता' : 'Bilingual voice guidance'}</li>
                      <li>✓ {language === 'hi' ? 'प्रिंटेड ओपीडी टोकन पर्ची' : 'Instant printed OPD token slip'}</li>
                    </ul>
                    <button type="button" className="gov-btn gov-btn-primary" style={{ width: '100%', marginTop: 'auto', minHeight: '46px', fontWeight: '700' }}>
                      {language === 'hi' ? 'कियोस्क पर शुरू करें' : 'Proceed on Kiosk'} <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Option 2: Continue on Your Mobile Phone */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="kiosk-platform-card mobile-accent"
                    onClick={() => { setPlatformChoiceMode('mobile_qr'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPlatformChoiceMode('mobile_qr'); }}
                  >
                    <div className="platform-card-badge accent">
                      {language === 'hi' ? 'निजी व कॉन्टैक्टलेस' : 'Private & Contactless'}
                    </div>
                    <div className="platform-icon-circle accent">
                      <Smartphone size={34} color="var(--gov-accent)" />
                    </div>
                    <h3 className="platform-title">
                      {language === 'hi' ? 'अपने मोबाइल फोन पर जारी रखें' : 'Continue on Your Mobile'}
                    </h3>
                    <p className="platform-desc">
                      {language === 'hi'
                        ? 'क्यूआर कोड स्कैन करें और अपने फोन के ब्राउज़र में आराम से बैठकर लक्षण व पंजीकरण दर्ज करें।'
                        : 'Scan QR code and complete symptom check comfortably on your personal smartphone browser.'}
                    </p>
                    <ul className="platform-features">
                      <li>✓ {language === 'hi' ? '100% कॉन्टैक्टलेस व निजी' : '100% private & contactless'}</li>
                      <li>✓ {language === 'hi' ? 'प्रतीक्षालय में बैठकर भरें' : 'Complete sitting anywhere in OPD'}</li>
                      <li>✓ {language === 'hi' ? 'लाइव डिजिटल टोकन फोन पर' : 'Live queue alerts & digital token'}</li>
                    </ul>
                    <button type="button" className="gov-btn gov-btn-accent" style={{ width: '100%', marginTop: 'auto', minHeight: '46px', fontWeight: '700' }}>
                      <QrCode size={18} /> {language === 'hi' ? 'मोबाइल क्यूआर कोड देखें' : 'Scan QR for Mobile'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mobile QR Code Intake Hub */
            <div className="kiosk-mobile-qr-screen">
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  onClick={() => setPlatformChoiceMode('choose')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={15} /> {language === 'hi' ? 'विकल्प बदलें' : 'Back to Choice'}
                </button>
                <button
                  type="button"
                  className="gov-btn gov-btn-primary gov-btn-sm"
                  onClick={() => { setStep('abha_login'); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {language === 'hi' ? 'कियोस्क पर ही जारी रखें' : 'Switch to Kiosk Instead'} <ArrowRight size={15} />
                </button>
              </div>

              <div className="gov-card kiosk-mobile-qr-card">
                <div className="kiosk-qr-header">
                  <div className="kiosk-qr-icon-badge">
                    <QrCode size={26} color="var(--gov-accent)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gov-primary)', margin: 0 }}>
                      {language === 'hi' ? 'स्मार्टफोन से क्यूआर कोड स्कैन करें' : 'Scan QR Code on Your Mobile'}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', margin: '3px 0 0' }}>
                      {language === 'hi'
                        ? 'कैमरा या किसी भी स्कैनर (Google Lens / Paytm) से स्कैन कर अपने फोन पर सत्र जारी रखें'
                        : 'Point phone camera or scanner to continue your intake session privately on your smartphone'}
                    </p>
                  </div>
                </div>

                {/* Big High-Contrast QR Code */}
                <div className="kiosk-qr-frame">
                  <QRCodeSVG
                    value={mobileIntakeUrl}
                    size={230}
                    level="M"
                    includeMargin={true}
                  />
                </div>

                {/* ngrok Tunnel Indicator & Status */}
                <div className={`kiosk-tunnel-status-pill ${networkInfo?.tunnelSource === 'ngrok_auto' ? 'ngrok-active' : networkInfo?.tunnelSource === 'custom' ? 'custom-active' : 'lan-active'}`}>
                  <span className="tunnel-indicator-dot"></span>
                  <span className="tunnel-status-text">
                    {networkInfo?.tunnelSource === 'ngrok_auto'
                      ? (language === 'hi' ? '🌐 ngrok पब्लिक टनल सक्रिय (कोई भी फोन इंटरनेट से जुड़ सकता है)' : '🌐 Active ngrok Public Tunnel (Connect from any phone on internet)')
                      : networkInfo?.tunnelSource === 'custom'
                      ? (language === 'hi' ? '🔵 कस्टम ngrok टनल सक्रिय' : '🔵 Custom ngrok Tunnel Active')
                      : (language === 'hi' ? '📡 लोकल वाई-फाई नेटवर्क (फोन व कियोस्क समान वाई-फाई पर होने चाहिए)' : '📡 Local Wi-Fi (Phone & Kiosk must be on same Wi-Fi)')}
                  </span>
                </div>

                {/* Direct URL Box with Copy & Open Actions */}
                <div className="kiosk-url-copy-box">
                  <div className="kiosk-url-text" title={mobileIntakeUrl}>
                    {mobileIntakeUrl}
                  </div>
                  <button
                    type="button"
                    className="gov-btn gov-btn-outline gov-btn-sm"
                    onClick={handleCopyMobileUrl}
                    style={{ flexShrink: 0 }}
                  >
                    {linkCopied ? (
                      <span style={{ color: 'var(--status-completed)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> {language === 'hi' ? 'कॉपी हुआ!' : 'Copied!'}
                      </span>
                    ) : (
                      <span>{language === 'hi' ? 'लिंक कॉपी' : 'Copy Link'}</span>
                    )}
                  </button>
                  <a
                    href={mobileIntakeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gov-btn gov-btn-accent gov-btn-sm"
                    style={{ flexShrink: 0, textDecoration: 'none' }}
                  >
                    {language === 'hi' ? 'ब्राउज़र में खोलें' : 'Open in Tab'}
                  </a>
                </div>

                {/* ngrok Configuration Collapse / Edit Drawer */}
                <div className="kiosk-ngrok-config-drawer">
                  <button
                    type="button"
                    className="kiosk-ngrok-toggle-btn"
                    onClick={() => setShowTunnelSettings(!showTunnelSettings)}
                  >
                    <span>⚙️ {language === 'hi' ? 'ngrok टनल सेटिंग्स / कस्टम URL दर्ज करें' : 'ngrok Tunnel Settings & Custom URL'}</span>
                    <ChevronRight size={16} style={{ transform: showTunnelSettings ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>

                  {showTunnelSettings && (
                    <div className="kiosk-tunnel-settings-body">
                      <p style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginBottom: '8px' }}>
                        {language === 'hi'
                          ? 'यदि आप ngrok चला रहे हैं (उदा. ngrok http 5173), तो उसका पब्लिक HTTPS URL यहाँ दर्ज करें या स्वतः पहचानें:'
                          : 'If you are running ngrok (e.g. ngrok http 5173), paste its public HTTPS URL below or auto-detect:'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="gov-input"
                          style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}
                          placeholder="https://xyz.ngrok-free.app"
                          value={customTunnelInput}
                          onChange={(e) => setCustomTunnelInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="gov-btn gov-btn-primary gov-btn-sm"
                          onClick={() => handleSaveCustomTunnel(customTunnelInput)}
                        >
                          {language === 'hi' ? 'टनल सहेजें' : 'Save Tunnel'}
                        </button>
                        <button
                          type="button"
                          className="gov-btn gov-btn-outline gov-btn-sm"
                          onClick={handleRefreshNetworkInfo}
                          title="Auto-detect ngrok from 127.0.0.1:4040"
                        >
                          <RefreshCw size={14} className={refreshingTunnel ? 'spin' : ''} /> {language === 'hi' ? 'ऑटो डिटेक्ट' : 'Auto-Detect'}
                        </button>
                        {customTunnelInput && (
                          <button
                            type="button"
                            className="gov-btn gov-btn-outline gov-btn-sm"
                            onClick={() => { setCustomTunnelInput(''); handleSaveCustomTunnel(''); }}
                          >
                            {language === 'hi' ? 'रीसेट' : 'Reset'}
                          </button>
                        )}
                      </div>
                      {tunnelSavedNotice && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--status-completed)', fontWeight: '600' }}>
                          ✓ {tunnelSavedNotice}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3 Step Instruction Guide for Patients */}
                <div className="kiosk-instructions-grid">
                  <div className="kiosk-step-mini-card">
                    <div className="step-mini-num">1</div>
                    <div>
                      <strong>{language === 'hi' ? 'कैमरा खोलें' : 'Open Camera'}</strong>
                      <p>{language === 'hi' ? 'फोन का कैमरा या कोई भी स्कैनर खोलें' : 'Open smartphone camera or Google Lens'}</p>
                    </div>
                  </div>
                  <div className="kiosk-step-mini-card">
                    <div className="step-mini-num">2</div>
                    <div>
                      <strong>{language === 'hi' ? 'क्यूआर स्कैन करें' : 'Scan QR Code'}</strong>
                      <p>{language === 'hi' ? 'स्क्रीन पर दिख रहे कोड को स्कैन करें' : 'Point at QR code and open link'}</p>
                    </div>
                  </div>
                  <div className="kiosk-step-mini-card">
                    <div className="step-mini-num">3</div>
                    <div>
                      <strong>{language === 'hi' ? 'फोन पर टोकन लें' : 'Get Mobile Token'}</strong>
                      <p>{language === 'hi' ? 'लक्षण भरें व लाइव टोकन प्राप्त करें' : 'Complete intake and get OPD queue token'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== 3. PATIENT IDENTITY CHECK-IN (Single Decision Method Selector per Rule H) ========== */}
      {step === 'abha_login' && (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="gov-btn gov-btn-outline gov-btn-sm"
              onClick={() => { setStep('platform_choice'); setPlatformChoiceMode('choose'); setKioskAuthMethod(null); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={15} /> {language === 'hi' ? 'माध्यम बदलें' : 'Change Platform'}
            </button>
            <button
              type="button"
              className="gov-btn gov-btn-outline gov-btn-sm"
              onClick={() => { setStep('platform_choice'); setPlatformChoiceMode('mobile_qr'); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Smartphone size={15} color="var(--gov-accent)" /> {language === 'hi' ? 'मोबाइल पर जाएं' : 'Switch to Mobile'}
            </button>
          </div>

          <div className="gov-card" style={{ padding: '24px 28px', border: '1.5px solid var(--gov-border-strong)' }}>
            {!kioskAuthMethod ? (
              /* Single-Decision Method Selector: 2 large icon cards */
              <LoginMethodSelector
                onSelectMethod={(method) => {
                  setKioskAuthMethod(method);
                  setError(null);
                }}
              />
            ) : (
              /* Shared Unified LoginForm */
              <LoginForm
                method={kioskAuthMethod}
                value={kioskAuthMethod === 'abha' ? abhaInput : kioskPhoneInput}
                onChange={kioskAuthMethod === 'abha' ? setAbhaInput : setKioskPhoneInput}
                onSubmit={kioskAuthMethod === 'abha' ? handleAbhaVerify : handleKioskMobileVerify}
                loading={loading}
                onChangeMethod={() => { setKioskAuthMethod(null); setError(null); }}
                onCreateAbhaClick={() => setShowAbhaModal(true)}
                isPhoneView={false}
              />
            )}
          </div>
        </div>
      )}

      {/* ========== 4. OTP VERIFICATION (6 Separate Auto-Advancing Boxes) ========== */}
      {step === 'otp_verify' && (
        <div className="gov-card" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center', padding: '28px 24px' }}>
          <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', backgroundColor: 'var(--gov-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={28} color="var(--gov-primary)" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>{t.otp_title}</h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '8px', fontSize: '14px' }}>{t.otp_sub}</p>

          {abhaProfile && (
            <div style={{ backgroundColor: 'var(--status-completed-bg)', color: 'var(--status-completed)', border: '1px solid var(--status-completed-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
              ✓ ABHA Verified: {abhaProfile.name} • +91-{linkedPhone?.slice(0, 2)}****{linkedPhone?.slice(-2)}
            </div>
          )}

          {otpNotice && (
            <div style={{ backgroundColor: 'var(--gov-primary-light)', color: 'var(--gov-primary)', border: '1px solid var(--gov-primary-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
              ✓ {otpNotice}
            </div>
          )}

          <div className="gov-input-group" style={{ textAlign: 'center', marginTop: '10px' }}>
            <label htmlFor="kiosk-otp-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '15px' }}>
              {translate('6-Digit Verification Code')}
            </label>
            <OtpInputBox
              value={otp}
              onChange={setOtp}
              length={6}
              autoFocus={true}
            />
          </div>

          <button type="button" className="gov-btn gov-btn-accent gov-btn-lg" style={{ width: '100%', marginTop: '16px', minHeight: '52px', fontSize: '16px', fontWeight: '800' }} onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
            {loading ? 'Verifying...' : t.verify_otp} <CheckCircle2 size={18} />
          </button>

          <button type="button" className="gov-btn gov-btn-outline" style={{ width: '100%', marginTop: '12px', fontSize: '13px' }} onClick={() => { setStep('abha_login'); setOtp(''); setOtpSent(false); }}>
            {translate('Change Credentials / Resend OTP')}
          </button>
        </div>
      )}

      {/* ========== 4.5 CONSENT SCREEN ========== */}
      {step === 'consent' && (
        <div className="gov-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 16px', backgroundColor: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #a5d6a7' }}>
            <Shield size={30} color="#2e7d32" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '8px' }}>
            {translate('consent_title')}
          </h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            {translate('consent_sub')}
          </p>

          <div style={{
            textAlign: 'left',
            backgroundColor: 'var(--gov-surface-subtle)',
            border: '1px solid var(--gov-border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '24px',
            fontSize: '13.5px',
            lineHeight: '1.65',
            color: 'var(--gov-text-main)'
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{translate('consent_item_1')}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{translate('consent_item_2')}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{translate('consent_item_3')}</span>
            </div>
          </div>

          <div className="gov-sticky-cta-dock" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="gov-btn gov-btn-primary gov-btn-lg"
              style={{ width: '100%', padding: '14px' }}
              onClick={handleConsentAgree}
              disabled={loading}
            >
              {loading ? translate('Starting...') : translate('I Agree — Proceed')} <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="gov-btn gov-btn-outline"
              style={{ width: '100%', marginTop: '10px', fontSize: '13px' }}
              onClick={resetKiosk}
            >
              {translate('Cancel & Return to Home')}
            </button>
          </div>
        </div>
      )}

      {/* ========== 4.5 DOCUMENT UPLOAD (Before AI Inquiry) ========== */}
      {step === 'doc_upload' && (
        <div className="gov-card" style={{ maxWidth: '620px', margin: '0 auto', textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', backgroundColor: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #90caf9' }}>
            <FileUp size={28} color="#1565c0" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>
            {translate('Upload Documents (Optional)')}
          </h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '22px', fontSize: '14px' }}>
            {translate('doc_upload_sub')}
          </p>

          {/* Upload Area */}
          <label
            htmlFor="kiosk-doc-upload"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '28px 20px',
              border: '2px dashed var(--gov-border-strong)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              backgroundColor: 'var(--gov-surface-subtle)',
              transition: 'all 0.18s ease',
              marginBottom: '16px'
            }}
          >
            <Upload size={32} color="var(--gov-primary)" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gov-primary)' }}>
              {translate('Tap to choose a file')}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--gov-text-muted)' }}>
              PDF, JPG, PNG — Max 10MB
            </span>
            <input
              id="kiosk-doc-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={(e) => handleDocUpload(e.target.files[0])}
              disabled={uploadLoading}
            />
          </label>

          {uploadLoading && (
            <div style={{ marginBottom: '12px', color: 'var(--gov-accent)', fontWeight: '600', fontSize: '13px' }}>
              {translate('Uploading & extracting text...')}
            </div>
          )}

          {/* Uploaded Documents List */}
          {uploadedDocs.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gov-text-main)', marginBottom: '8px' }}>
                ✓ {uploadedDocs.length} document{uploadedDocs.length > 1 ? 's' : ''} uploaded
              </div>
              {uploadedDocs.map((doc, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--status-completed-bg)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '6px',
                    fontSize: '12.5px',
                    color: 'var(--status-completed)'
                  }}
                >
                  <FileText size={14} />
                  <span style={{ flex: 1 }}>{doc.doc_type?.toUpperCase() || 'DOCUMENT'} — OCR extracted</span>
                  <CheckCircle2 size={14} />
                </div>
              ))}
            </div>
          )}

          {/* Action Button — proceed to AI Inquiry */}
          <div className="gov-sticky-cta-dock" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="gov-btn gov-btn-primary gov-btn-lg"
              style={{ width: '100%' }}
              onClick={handleProceedToInquiry}
              disabled={loading}
            >
              {loading ? translate('Starting...') : translate('Start AI Doctor Consultation (Voice/Chat)')} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========== 5. AI INQUIRY CONVERSATION ========== */}
      {step === 'ai_inquiry' && (
        <div className="phone-ai-inquiry-container kiosk-ai-container">
          {/* Government Official Triage Header */}
          <div className="phone-ai-header">
            <div className="phone-ai-header-left">
              <div className="phone-ai-badge-icon">
                <Stethoscope size={20} color="#FFFFFF" />
              </div>
              <div className="phone-ai-header-titles">
                <div className="phone-ai-gov-tag">राष्ट्रीय स्वास्थ्य मिशन • National Health Mission</div>
                <h3 className="phone-ai-title">
                  {translate('AI Clinical OPD Triage')} · {language === 'hi' ? 'स्मार्ट लक्षण जांच' : 'Smart Intake'}
                </h3>
              </div>
            </div>
            <div className="phone-ai-header-right">
              {abhaProfile ? (
                <span className="phone-ai-patient-chip" title="ABHA Verified Patient">
                  <ShieldCheck size={14} color="#0b6b63" />
                  <span>{abhaProfile.name?.split(' ')[0]}</span>
                </span>
              ) : (
                <span className="phone-ai-patient-chip">
                  <UserCircle size={14} color="#0b6b63" />
                  <span>{linkedPhone ? `+91-${linkedPhone.slice(-4)}` : translate('Citizen')}</span>
                </span>
              )}
              <button 
                type="button" 
                className="phone-ai-audio-toggle"
                onClick={() => speakQuestionViaBhashini(currentQuestion)}
                title={translate('Listen to question via Audio')}
                aria-label="Listen via Speech"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>

          {/* Bhashini & AI Triage Trust Bar */}
          <div className="phone-ai-subbar">
            <span className="phone-ai-subbar-text">
              <Sparkles size={13} color="#0b6b63" />
              {translate('Ministry of Ayush Protocol • Powered by MeitY Bhashini AI')}
            </span>
            {uploadedDocs.length > 0 && (
              <span style={{ fontSize: '11.5px', color: '#065f46', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={12} /> {uploadedDocs.length} {uploadedDocs.length > 1 ? 'documents' : 'document'} analyzed
              </span>
            )}
          </div>

          {/* Chat Messages Scrollable Area */}
          <div className="phone-ai-chat-area kiosk-ai-chat-area">
            {/* Welcome Official Message */}
            <div className="phone-chat-bubble ai-msg">
              <div className="phone-bubble-avatar">
                <Bot size={16} color="#FFFFFF" />
              </div>
              <div className="phone-bubble-body">
                <div className="phone-bubble-sender">
                  <span>MediKiosk Medical Assistant</span>
                  <span className="phone-sender-badge">Official AI</span>
                </div>
                <p className="phone-bubble-text">
                  <NamasteIcon size={16} color="var(--gov-primary)" /> {translate('ai_welcome_intro')}{uploadedDocs.length > 0 ? ` ${translate('ai_welcome_reviewed')}` : ''}
                </p>
              </div>
            </div>

            {/* Conversation History */}
            {conversationHistory.map((entry, i) => (
              <React.Fragment key={i}>
                <div className="phone-chat-bubble ai-msg">
                  <div className="phone-bubble-avatar">
                    <Bot size={16} color="#FFFFFF" />
                  </div>
                  <div className="phone-bubble-body">
                    <div className="phone-bubble-sender">
                      <span>MediKiosk Medical Assistant</span>
                    </div>
                    <p className="phone-bubble-text">{entry.question}</p>
                  </div>
                </div>
                <div className="phone-chat-bubble patient-msg">
                  <div className="phone-bubble-body">
                    <div className="phone-bubble-sender patient-sender">
                      <span>{translate('Patient Response')}</span>
                    </div>
                    <p className="phone-bubble-text">{entry.answer}</p>
                  </div>
                  <div className="phone-bubble-avatar patient-avatar">
                    <UserCircle size={16} color="#FFFFFF" />
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Current Question */}
            {currentQuestion && (
              <div className="phone-chat-bubble ai-msg active-question-bubble">
                <div className="phone-bubble-avatar">
                  <Bot size={16} color="#FFFFFF" />
                </div>
                <div className="phone-bubble-body">
                  <div className="phone-bubble-sender">
                    <span>MediKiosk Medical Assistant</span>
                    <button 
                      type="button" 
                      className="phone-bubble-speak-btn"
                      onClick={() => speakQuestionViaBhashini(currentQuestion)}
                      title="Listen to this question"
                    >
                      <Volume2 size={13} />
                      <span>{translate('Listen')}</span>
                    </button>
                  </div>
                  <p className="phone-bubble-text main-question">
                    {currentQuestion.question?.[currentLang] || currentQuestion.question?.en}
                  </p>
                  {currentQuestion.help_text && (
                    <p className="phone-bubble-help">
                      {currentQuestion.help_text?.[currentLang] || currentQuestion.help_text?.en}
                    </p>
                  )}

                  {/* Interactive Symptom Option Chips */}
                  {currentQuestion.options && currentQuestion.options.length > 0 && (
                    <div className="phone-ai-options">
                      <div className="phone-options-hint">
                        {translate('Select an option below or speak / type:')}
                      </div>
                      <div className="phone-options-grid">
                        {currentQuestion.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="phone-ai-option-btn"
                            onClick={() => handleOptionSelect(opt.id, opt.label)}
                            disabled={loading}
                          >
                            <span className="opt-dot"></span>
                            <span className="opt-text">{opt.label?.[currentLang] || opt.label?.en}</span>
                            <ArrowRight size={14} className="opt-arrow" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Typing / Processing Indicator */}
            {loading && (
              <div className="phone-chat-bubble ai-msg loading-bubble">
                <div className="phone-bubble-avatar">
                  <Bot size={16} color="#FFFFFF" />
                </div>
                <div className="phone-bubble-body typing-body">
                  <div className="ai-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="typing-label">
                    {translate('Analyzing symptoms...')}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Voice Notice Feedback */}
          {voiceNotice && (
            <div className="phone-voice-feedback-banner">
              <Mic size={15} className="voice-pulse-icon" />
              <span>{voiceNotice}</span>
            </div>
          )}

          {/* Touch-Friendly Modern Input Bar */}
          <div className="phone-ai-input-bar kiosk-ai-input-bar">
            <button 
              type="button" 
              className={`phone-ai-mic-btn ${isRecording ? 'recording' : ''}`} 
              onClick={handleVoiceInput} 
              disabled={loading}
              title={isRecording ? translate('Tap to stop recording') : translate('Press to Speak')}
              aria-label="Speak symptoms"
            >
              {isRecording ? <Volume2 size={22} /> : <Mic size={22} />}
            </button>
            <div className="phone-ai-input-wrap">
              <input
                type="text"
                className="phone-ai-text-input"
                placeholder={t.type_placeholder || translate('Type your symptoms here...')}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
                disabled={loading}
              />
            </div>
            <button 
              type="button" 
              className="phone-ai-send-btn" 
              onClick={handleTextSubmit} 
              disabled={loading || !textInput.trim()}
              title="Send answer"
              aria-label="Send answer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========== 6. CLINICAL REPORT ========== */}
      {step === 'report' && (
        <div className="gov-card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', backgroundColor: 'var(--gov-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={28} color="var(--gov-primary)" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>{t.report_title}</h2>
            <p style={{ color: 'var(--gov-text-muted)', fontSize: '14px' }}>{t.report_sub}</p>
          </div>

          {loading && !clinicalReport && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="ai-typing-indicator" style={{ justifyContent: 'center', marginBottom: '16px' }}>
                <span></span><span></span><span></span>
              </div>
              <p style={{ color: 'var(--gov-text-muted)', fontWeight: '600' }}>Generating your clinical report...</p>
            </div>
          )}

          {clinicalReport && (
            <>
              {/* Report Card */}
              <div className="clinical-report-card">
                <div className="report-section">
                  <h4><Activity size={16} /> Chief Complaint</h4>
                  <p>{clinicalReport.chief_complaint || 'General Consultation'}</p>
                </div>

                <div className="report-section">
                  <h4><FileText size={16} /> Symptom Summary</h4>
                  <p>{clinicalReport.symptom_summary || clinicalReport.report_text_en}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div className="report-badge">
                    <span className="report-badge-label">Severity</span>
                    <span className={`report-badge-value severity-${clinicalReport.severity_assessment || 'moderate'}`}>
                      {(clinicalReport.severity_assessment || 'moderate').toUpperCase()}
                    </span>
                  </div>
                  <div className="report-badge">
                    <span className="report-badge-label">Urgency</span>
                    <span className={`report-badge-value urgency-${clinicalReport.urgency_flag || 'routine'}`}>
                      {(clinicalReport.urgency_flag || 'routine').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="report-section" style={{ marginTop: '16px' }}>
                  <h4><Stethoscope size={16} /> Recommended Department</h4>
                  <p style={{ fontWeight: '700', color: 'var(--gov-accent)', fontSize: '16px' }}>
                    {clinicalReport.recommended_department || 'General Medicine'}
                  </p>
                </div>

                {clinicalReport.clinical_notes && (
                  <div className="report-section">
                    <h4><MessageCircle size={16} /> Clinical Notes</h4>
                    <p>{clinicalReport.clinical_notes}</p>
                  </div>
                )}

                {clinicalReport.history_summary && clinicalReport.history_summary !== 'No prior records.' && (
                  <div className="report-section">
                    <h4><ClipboardList size={16} /> Medical History</h4>
                    <p>{clinicalReport.history_summary}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="gov-sticky-cta-dock" style={{ marginTop: '24px' }}>
                <button type="button" className="gov-btn gov-btn-primary gov-btn-lg" style={{ width: '100%' }} onClick={handleJoinQueue} disabled={loading}>
                  {loading ? 'Processing...' : t.join_queue} <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== 7. COMPLETION & TOKEN ========== */}
      {step === 'completed' && issuedToken && (
        <div className="gov-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '36px 28px' }}>
          {yourTurnEvent && (
            <div className="call-alert-box active-call" role="alert" style={{ marginBottom: '20px', padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: '#dcfce7', border: '2px solid #22c55e' }}>
              <Bell size={32} color="#15803d" style={{ margin: '0 auto 6px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#15803d', margin: '4px 0' }}>IT IS YOUR TURN!</h3>
              <p style={{ fontSize: '15px', fontWeight: '800', margin: '4px 0', color: '#14532D' }}>{yourTurnEvent.message}</p>
              <div style={{ fontSize: '14px', color: '#166534', fontWeight: '700' }}>Proceed immediately to Room: {yourTurnEvent.room_number}</div>
            </div>
          )}

          <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', backgroundColor: 'var(--status-completed-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--status-completed-border)' }}>
            <CheckCircle2 size={36} color="var(--status-completed)" />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>{t.intake_done}</h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px', fontSize: '14.5px' }}>{t.proceed_msg}</p>

          <div style={{ backgroundColor: 'var(--gov-primary-light)', border: '2px solid var(--gov-primary-border)', padding: '24px', borderRadius: 'var(--radius-lg)', margin: '20px 0' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '800', color: 'var(--gov-text-muted)', letterSpacing: '0.5px' }}>{t.token_issued}</div>
            <div style={{ fontSize: '64px', fontWeight: '900', color: 'var(--gov-primary)', lineHeight: 1.1, margin: '8px 0' }}>#{issuedToken.token_number}</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gov-text-main)', marginTop: '4px' }}>
              {issuedToken.department_name || 'General OPD'}
            </div>
            {issuedToken.doctor_name && (
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gov-accent)', marginTop: '4px' }}>
                {translate('Doctor:')} {issuedToken.doctor_name}
              </div>
            )}
            {issuedToken.room_number && (
              <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--gov-accent)', marginTop: '6px' }}>
                {translate('Room:')} {issuedToken.room_number}
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--status-completed)', fontWeight: '700' }}>
              ✓ {translate('Queued for Consultation')}
            </div>
          </div>

          <div className="gov-sticky-cta-dock" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '14px', flexWrap: 'wrap', width: '100%' }}>
              <button type="button" className="gov-btn gov-btn-accent gov-btn-lg" onClick={() => setShowReceiptSlip(true)} style={{ flex: 1 }}>
                <Printer size={18} /> {translate('Print OPD Queue Slip')}
              </button>
              {abhaProfile?.abha_number && (
                <button type="button" className="gov-btn gov-btn-outline gov-btn-lg" onClick={() => setShowAbhaModal(true)}>
                  <ShieldCheck size={18} /> {translate('View ABHA Card')}
                </button>
              )}
            </div>

            <button type="button" className="gov-btn gov-btn-primary" onClick={resetKiosk} style={{ width: '100%', padding: '12px' }}>
              {translate('Complete Session & Return to Main Screen')}
            </button>
          </div>
        </div>
      )}



      {/* Modals */}
      {showReceiptSlip && (
        <OpdReceiptSlip token={issuedToken} hospitalName={currentHospital?.name} onClose={() => setShowReceiptSlip(false)} />
      )}
      {showAbhaModal && (
        <AbhaCardModal abhaId={abhaProfile?.abha_number} patientPhone={linkedPhone} onClose={() => setShowAbhaModal(false)} />
      )}
    </ScrollableContentArea>
  );
}
