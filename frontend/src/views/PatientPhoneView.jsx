import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../services/api';
import { 
  Smartphone, Phone, QrCode, CheckCircle2, AlertCircle, Clock, 
  Upload, FileText, ArrowRight, Bell, Sparkles, LogOut, History, ShieldAlert,
  Building2, RefreshCw, Volume2, Mic, MicOff, Printer, ShieldCheck, ArrowLeft,
  Bot, UserCircle, Send, Stethoscope, ClipboardList, Activity, MessageCircle,
  Hash, AtSign, PhoneCall, User, X, Shield, FileUp, Wifi, Info
} from 'lucide-react';
import { speakText, stopAllSpeech, playAssistantSpeech, startSpeechRecognition } from '../utils/speechHelper';
import OpdReceiptSlip from '../components/OpdReceiptSlip';
import AbhaCardModal from '../components/AbhaCardModal';
import LoginMethodSelector from '../components/common/LoginMethodSelector';
import LoginForm from '../components/common/LoginForm';
import OtpInputBox from '../components/common/OtpInputBox';
import NamasteIcon from '../components/common/NamasteIcon';
import patientIntakeIcon from '../assets/patient-intake-icon.png';
import '../styles/patient-phone.css';

export default function PatientPhoneView() {
  const { 
    hospitals, selectedHospitalId, selectHospital, patientToken, patientSession, patientData, 
    verifyPatientOtp, updatePatientSessionVerified, logoutPatient 
  } = useAuth();
  const { yourTurnEvent, subscribeToCase, queueUpdateTrigger, triggerSync } = useWebSocket();

  const [screen, setScreen] = useState(patientToken ? 'waiting' : 'login');
  const [consentGiven, setConsentGiven] = useState(false);
  const { language: currentLang, translate } = useLanguage();
  const [isKioskLinked, setIsKioskLinked] = useState(false);

  // Patient Login Method & Help state
  const [loginMethod, setLoginMethod] = useState(null); // 'abha' | 'mobile' | null
  const [showWhatIsAbha, setShowWhatIsAbha] = useState(false);

  // ABHA Login State
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

  // Phone Login State (legacy fallback)
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Case & Intake (legacy tree)
  const [caseData, setCaseData] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [isTerminal, setIsTerminal] = useState(false);
  const [activeToken, setActiveToken] = useState(null);

  // AI Inquiry State
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [clinicalReport, setClinicReport] = useState(null);
  const chatEndRef = useRef(null);

  // Kiosk Code Scan Input
  const [scanCode, setScanCode] = useState('');

  // History state
  const [historyCases, setHistoryCases] = useState([]);

  // Modals & Voice
  const [showReceiptSlip, setShowReceiptSlip] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  // Audio Speech TTS with lifecycle cancellation
  const handleSpeakQuestion = (question) => {
    const q = question || currentNode?.question || currentQuestion?.question;
    if (!q) return;
    const textToSpeak = q[currentLang] || q.en;
    playAssistantSpeech(textToSpeak, currentLang);
  };

  // Auto-silence voice assistant whenever user navigates away from AI inquiry screen or unmounts
  useEffect(() => {
    if (screen !== 'ai_inquiry') {
      stopAllSpeech();
      setIsRecording(false);
    }

    return () => {
      stopAllSpeech();
    };
  }, [screen]);

  // Document Upload
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestion]);

  // Check URL query parameters (when scanned from Kiosk QR code)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qPhone = params.get('phone');
    const qToken = params.get('token');
    const qHosp = params.get('hospital');
    const qOtpSent = params.get('otp_sent');
    const qName = params.get('name');
    const qAbha = params.get('abha');
    const qKiosk = params.get('kiosk');
    const qSession = params.get('session_id');

    if (qKiosk === '1' || qSession) {
      setIsKioskLinked(true);
    }

    if (qHosp) selectHospital(qHosp);
    if (qPhone) {
      setPhone(qPhone);
      setLinkedPhone(qPhone);
      setAbhaInput(qPhone);
    }
    if (qOtpSent === '1' && qPhone) {
      setOtpSent(true);
      setOtpNotice(`OTP sent to +91-${qPhone.slice(0, 2)}****${qPhone.slice(-2)} via Kiosk`);
    }
    if (qName || qAbha) {
      setAbhaProfile({
        name: qName || 'Patient',
        abha_number: qAbha || null
      });
    }

    if (qToken) {
      loadSessionCase();
    } else if (patientToken && patientSession) {
      loadSessionCase();
    }
  }, [patientToken]);

  // Subscribe to WebSocket case room
  useEffect(() => {
    if (caseData?.id) {
      subscribeToCase(caseData.id);
    }
  }, [caseData?.id]);

  const loadSessionCase = async () => {
    try {
      const res = await api.get('/intake/session-case', patientToken);
      setCaseData(res.case);
      setCurrentNode(res.current_node);
      setIsTerminal(res.is_terminal);

      if (res.case?.status === 'ready_for_doctor' || res.case?.status === 'in_consult') {
        setScreen('waiting');
      } else if (res.is_terminal) {
        const completeRes = await api.post('/intake/complete', { case_id: res.case.id }, patientToken);
        if (completeRes.status === 'queued') {
          setActiveToken(completeRes.token);
          setScreen('waiting');
        }
      } else {
        // Start AI inquiry instead of legacy tree
        startAiInquiry();
      }
    } catch (err) {
      console.log('No active session case');
    }
  };

  // ===== ABHA VERIFY + OTP =====
  const handleAbhaVerify = async () => {
    if (!abhaInput || abhaInput.trim().length < 3) {
      setError('Please enter a valid ABHA Number, ABHA Address, or Mobile Number');
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
      setPhone(phoneToSend);

      // Send OTP
      const otpRes = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone: phoneToSend
      });
      setOtpSent(true);
      setOtpNotice(otpRes.message);
      if (otpRes.debug_otp) console.log(`[MediKiosk OTP]: ${otpRes.debug_otp}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrsProceed = async (data) => {
    setError(null);
    setLoading(true);
    try {
      setAbhaInput(data.identifier);
      setAbhaProfile(data.profile);
      const phoneToSend = data.linkedPhone || data.identifier.replace(/\D/g, '').slice(-10);
      setLinkedPhone(phoneToSend);
      setPhone(phoneToSend);

      // Send OTP to linked phone
      const otpRes = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone: phoneToSend
      });
      setOtpSent(true);
      setOtpNotice(otpRes.message);
      if (otpRes.debug_otp) console.log(`[MediKiosk OTP]: ${otpRes.debug_otp}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone
      });
      setOtpSent(true);
      setOtpNotice(res.message);
      if (res.debug_otp) console.log(`[MediKiosk OTP]: ${res.debug_otp}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP received on SMS');
      return;
    }
    const enteredOtp = otp;
    setOtp(''); // Clear immediately to enforce strictly single-use OTP
    setError(null);
    setLoading(true);
    try {
      const activePhone = linkedPhone || phone;
      await verifyPatientOtp(activePhone, enteredOtp, false, currentLang);

      // Update profile with ABHA data if available
      if (abhaProfile && patientToken) {
        try {
          await api.put('/auth/patient/profile', {
            name: abhaProfile.name,
            age: abhaProfile.age,
            gender: abhaProfile.gender,
            abha_id: abhaProfile.abha_number
          }, patientToken);
        } catch {}
      }

      // Route to consent screen before inquiry
      setScreen('consent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== CONSENT =====
  const handleConsentAgree = async () => {
    setConsentGiven(true);
    // Proceed to Document Upload first so documents can serve as clinical context for AI
    setScreen('doc_upload');
  };

  // ===== AI INQUIRY =====
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
      setScreen('ai_inquiry');

      // Instant zero-lag TTS speech
      const textToSpeak = firstQ.question?.[currentLang] || firstQ.question?.en;
      playAssistantSpeech(textToSpeak, currentLang);
    } catch (err) {
      // Fallback to legacy intake
      setScreen('intake');
      loadSessionCase();
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (optionId, optionLabel) => {
    if (!currentQuestion) return;
    stopAllSpeech();
    const answerText = optionLabel?.[currentLang] || optionLabel?.en || optionId;
    await processAnswer(answerText);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    stopAllSpeech();
    await processAnswer(textInput.trim());
    setTextInput('');
  };

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

    try {
      const docContext = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
      const nextQ = await api.post('/intake/ai-inquiry', {
        conversation_history: newHistory,
        language: currentLang,
        document_context: docContext
      });

      if (nextQ.is_terminal) {
        stopAllSpeech();
        setCurrentQuestion(null);
        // Documents already uploaded, generate report directly
        const ocrTexts = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
        await generateClinicalReport(newHistory, ocrTexts);
      } else {
        setCurrentQuestion(nextQ);
        // Instant zero-lag TTS speech
        const nextText = nextQ.question?.[currentLang] || nextQ.question?.en;
        playAssistantSpeech(nextText, currentLang);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const activeQuestion = currentQuestion || currentNode;
    if (!activeQuestion) return;
    setIsRecording(true);
    setVoiceNotice('Listening...');

    const recognition = startSpeechRecognition({
      lang: currentLang,
      onResult: async (transcript) => {
        setVoiceNotice(`"${transcript}"`);
        setIsRecording(false);

        const options = activeQuestion.options;
        if (options && options.length > 0) {
          try {
            const mapRes = await api.post('/intake/voice-map', {
              transcript,
              valid_options: options,
              language: currentLang
            });
            if (mapRes.matched_option_id && mapRes.confidence > 0.6) {
              if (screen === 'ai_inquiry') {
                const opt = options.find(o => o.id === mapRes.matched_option_id);
                await handleOptionSelect(mapRes.matched_option_id, opt?.label);
              } else {
                handleAnswer(mapRes.matched_option_id);
              }
              return;
            }
          } catch {}
        }

        if (screen === 'ai_inquiry') {
          await processAnswer(transcript);
        } else {
          setVoiceNotice('No match. Please tap an option.');
        }
      },
      onError: () => {
        setIsRecording(false);
        setVoiceNotice('Microphone unavailable.');
      },
      onEnd: () => setIsRecording(false)
    });

    if (!recognition) {
      setIsRecording(false);
      setVoiceNotice('Voice input not supported.');
    }
  };

  // ===== DOCUMENT UPLOAD =====
  const handleDocUpload = async (file) => {
    if (!file) return;
    setUploading(true);
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
      setUploading(false);
    }
  };

  const handleProceedToReport = async () => {
    const ocrTexts = uploadedDocs.filter(d => d.ocr_text).map(d => d.ocr_text);
    await generateClinicalReport(conversationHistory, ocrTexts);
  };

  // ===== REPORT GENERATION =====
  const generateClinicalReport = async (history, ocrTexts = []) => {
    stopAllSpeech();
    setLoading(true);
    setScreen('report');
    try {
      const reportRes = await api.post('/intake/generate-report', {
        conversation_history: history,
        patient_info: abhaProfile || patientData || { name: 'Patient', age: 30, gender: 'Other' },
        abha_number: abhaProfile?.abha_number || patientData?.abha_id || null,
        case_id: caseData?.id || null,
        ocr_texts: ocrTexts
      });
      setClinicReport(reportRes.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== JOIN QUEUE =====
  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      let myCase = caseData;
      if (patientToken) {
        if (!myCase) {
          const caseRes = await api.get('/intake/session-case', patientToken);
          myCase = caseRes.case;
          setCaseData(myCase);
        }
        const completeRes = await api.post('/intake/complete', { case_id: myCase.id }, patientToken);
        if (completeRes.status === 'queued') {
          setActiveToken(completeRes.token);
          setScreen('waiting');
        }
      } else {
        setActiveToken({
          token_number: Math.floor(Math.random() * 50) + 1,
          department_name: clinicalReport?.recommended_department || 'General Medicine',
          room_number: 'OPD Room 3'
        });
        setScreen('waiting');
      }
    } catch (err) {
      setActiveToken({
        token_number: Math.floor(Math.random() * 50) + 1,
        department_name: clinicalReport?.recommended_department || 'General Medicine',
        room_number: 'OPD Room 3'
      });
      setScreen('waiting');
    } finally {
      setLoading(false);
    }
  };

  // Legacy tree answer
  const handleAnswer = async (optionId) => {
    if (!caseData || !currentNode) return;
    setLoading(true);
    try {
      const res = await api.post('/intake/answer', {
        case_id: caseData.id,
        question_id: currentNode.id,
        answer_text: optionId,
        answer_type: 'touch'
      }, patientToken);

      if (res.is_terminal) {
        setIsTerminal(true);
        setCurrentNode(res.next_node);

        const completeRes = await api.post('/intake/complete', { case_id: caseData.id }, patientToken);
        if (completeRes.status === 'queued') {
          setActiveToken(completeRes.token);
          setScreen('waiting');
        }
      } else {
        setCurrentNode(res.next_node);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKioskPresence = async () => {
    if (!scanCode || scanCode.length < 3) {
      setError('Please enter the code displayed on the Kiosk terminal');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/kiosk/verify-presence', { code: scanCode }, patientToken);
      updatePatientSessionVerified(true);
      if (res.queue_result?.token) {
        setActiveToken(res.queue_result.token);
      }
      setScreen('waiting');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !caseData) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('case_id', caseData.id);
    formData.append('doc_type', 'report');

    try {
      const res = await api.upload('/intake/upload-doc', formData, patientToken);
      setUploadedDocs(prev => [...prev, res.document]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/intake/patient-history', patientToken);
      setHistoryCases(res);
      setScreen('history');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="patient-phone-root">
      <div className="patient-phone-container">
        {/* Official Header Banner */}
        <header className="patient-phone-header" role="banner">
          <div className="patient-phone-brand">
            <div className="patient-phone-logo-badge">
              <Smartphone size={20} color="#FFFFFF" />
            </div>
            <div>
              <h1 className="patient-phone-main-heading">
                {translate('Ayush OPD Citizen Portal')}
              </h1>
              <p className="patient-phone-sub-heading">
                {translate('Government of India · Digital OPD')}
              </p>
            </div>
          </div>

          {patientToken && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button" 
                className="gov-btn gov-btn-sm" 
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF', border: 'none' }} 
                onClick={loadHistory}
              >
                <History size={13} /> {translate('History')}
              </button>
              <button 
                type="button" 
                className="gov-btn gov-btn-sm" 
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF', border: 'none' }} 
                onClick={logoutPatient} 
                title={translate('Sign Out')}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </header>

        {/* Main Single-Scroll Content Area */}
        <div className={`patient-phone-body ${screen === 'ai_inquiry' ? 'inquiry-active' : ''}`}>
          {isKioskLinked && (
            <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{currentLang === 'hi' ? 'कियोस्क सत्र से सफलतापूर्वक जुड़ा हुआ (Terminal #01)' : 'Connected to Kiosk Intake Session (Terminal #01)'}</span>
            </div>
          )}

          {error && (
            <div role="alert" style={{ backgroundColor: 'var(--status-priority-bg)', color: 'var(--status-priority)', border: '1px solid var(--status-priority-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. LOGIN SCREEN — Official Patient Intake */}
          {screen === 'login' && (
            <div className="phone-login-wrapper">
              {!otpSent ? (
                <div className="phone-auth-container">
                  {/* Header Context Banner when selecting method */}
                  {!loginMethod && (
                    <div className="phone-context-banner">
                      <div className="phone-context-badge">
                        <ShieldCheck size={18} color="#FFFFFF" />
                      </div>
                      <div>
                        <h2 className="phone-context-title">
                          {translate('Patient Login')}
                        </h2>
                        <p className="phone-context-subtitle">
                          {translate('Register using your ABHA or mobile number')}
                        </p>
                      </div>
                    </div>
                  )}

                  {!loginMethod ? (
                    /* Single-Decision Method Selector (Prompt Item [H] & [J]) */
                    <div className="phone-method-selection-wrap">
                      <LoginMethodSelector
                        onSelectMethod={(method) => {
                          setLoginMethod(method);
                          setError(null);
                        }}
                      />
                    </div>
                  ) : (
                    /* Shared Unified LoginForm */
                    <LoginForm
                      method={loginMethod}
                      value={loginMethod === 'abha' ? abhaInput : phone}
                      onChange={loginMethod === 'abha' ? setAbhaInput : setPhone}
                      onSubmit={loginMethod === 'abha' ? handleAbhaVerify : handleSendOtp}
                      loading={loading}
                      onChangeMethod={() => { setLoginMethod(null); setError(null); }}
                      onCreateAbhaClick={() => setShowAbhaModal(true)}
                      isPhoneView={true}
                    />
                  )}
                </div>
              ) : (
                /* OTP Verification View with 6 Auto-Advancing Boxes */
                <div className="phone-auth-container">
                  {/* Header Context Banner */}
                  <div className="phone-context-banner">
                    <div className="phone-context-badge">
                      <Phone size={18} color="#FFFFFF" />
                    </div>
                    <div>
                      <h2 className="phone-context-title">
                        {translate('OTP Verification')}
                      </h2>
                      <p className="phone-context-subtitle">
                        {translate('Enter the 6-digit code sent to your mobile')}
                      </p>
                    </div>
                  </div>

                  <div className="phone-auth-form">
                    {otpNotice && (
                      <div className="phone-notice-pill success">
                        ✓ {otpNotice}
                      </div>
                    )}

                    {abhaProfile && (
                      <div className="phone-notice-pill abha">
                        ✓ {translate('Verified Patient:')} {abhaProfile.name}
                      </div>
                    )}

                    <div className="gov-input-group" style={{ textAlign: 'center', marginTop: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '15px' }}>
                        {translate('6-Digit Verification Code')}
                      </label>
                      <OtpInputBox
                        value={otp}
                        onChange={setOtp}
                        length={6}
                        autoFocus={true}
                      />
                    </div>

                    <div className="phone-sticky-cta-wrap">
                      {otp.length < 6 && (
                        <div className="phone-cta-helper-text">
                          {translate('Please enter all 6 digits')}
                        </div>
                      )}
                      <button
                        type="button"
                        className="gov-btn gov-btn-accent phone-proceed-btn"
                        onClick={handleVerifyOtp}
                        disabled={loading || otp.length < 6}
                      >
                        {loading
                          ? translate('Verifying OTP...')
                          : translate('Verify OTP & Start')}
                        <CheckCircle2 size={18} />
                      </button>

                      <button
                        type="button"
                        className="gov-btn gov-btn-outline"
                        style={{ width: '100%', marginTop: '10px', fontSize: '13px' }}
                        onClick={() => { setOtpSent(false); setOtp(''); setAbhaProfile(null); }}
                      >
                        {translate('Change Credentials / Resend')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 1.5 CONSENT SCREEN */}
        {screen === 'consent' && (
          <div className="gov-card" style={{ textAlign: 'center', padding: '28px 20px', margin: '10px 0' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', backgroundColor: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #a5d6a7' }}>
              <Shield size={28} color="#2e7d32" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>
              {translate('consent_title')}
            </h3>
            <p style={{ color: 'var(--gov-text-muted)', marginBottom: '20px', fontSize: '13px' }}>
              {translate('consent_sub')}
            </p>

            <div style={{
              textAlign: 'left',
              backgroundColor: 'var(--gov-surface-subtle)',
              border: '1px solid var(--gov-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--gov-text-main)'
            }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{translate('consent_item_1')}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{translate('consent_item_2')}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="var(--gov-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{translate('consent_item_3')}</span>
              </div>
            </div>

            <div className="phone-sticky-cta-wrap">
              <button
                type="button"
                className="gov-btn gov-btn-primary gov-btn-lg"
                style={{ width: '100%', padding: '13px' }}
                onClick={handleConsentAgree}
                disabled={loading}
              >
                {loading ? translate('Starting...') : translate('I Agree — Start Consultation')} <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="gov-btn gov-btn-outline"
                style={{ width: '100%', marginTop: '10px', fontSize: '12.5px' }}
                onClick={() => { setScreen('login'); setConsentGiven(false); }}
              >
                {translate('Cancel & Return')}
              </button>
            </div>
          </div>
        )}

        {/* 2. AI INQUIRY SCREEN — Government OPD Clinical Triage Chat */}
        {screen === 'ai_inquiry' && (
          <div className="phone-ai-inquiry-container">
            {/* Government Official Triage Header */}
            <div className="phone-ai-header">
              <div className="phone-ai-header-left">
                <div className="phone-ai-badge-icon">
                  <Stethoscope size={18} color="#FFFFFF" />
                </div>
                <div className="phone-ai-header-titles">
                  <div className="phone-ai-gov-tag">राष्ट्रीय स्वास्थ्य मिशन • National Health Mission</div>
                  <h3 className="phone-ai-title">
                    {translate('AI Clinical OPD Triage')}
                  </h3>
                </div>
              </div>
              <div className="phone-ai-header-right">
                {abhaProfile ? (
                  <span className="phone-ai-patient-chip" title="ABHA Verified Patient">
                    <ShieldCheck size={13} color="#0b6b63" />
                    <span>{abhaProfile.name?.split(' ')[0]}</span>
                  </span>
                ) : (
                  <span className="phone-ai-patient-chip">
                    <UserCircle size={13} color="#0b6b63" />
                    <span>{phone ? `+91-${phone.slice(-4)}` : 'Citizen'}</span>
                  </span>
                )}
                <button 
                  type="button" 
                  className="phone-ai-audio-toggle"
                  onClick={() => handleSpeakQuestion(currentQuestion?.question)}
                  title="Listen to question via Audio"
                  aria-label="Listen via Speech"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </div>

            {/* Bhashini & AI Triage Trust Bar */}
            <div className="phone-ai-subbar">
              <span className="phone-ai-subbar-text">
                <Sparkles size={12} color="#0b6b63" />
                {translate('Ministry of Ayush Protocol • Powered by MeitY Bhashini AI')}
              </span>
            </div>

            {/* Chat Messages Scrollable Area */}
            <div className="phone-ai-chat-area">
              {/* Welcome Official Message */}
              <div className="phone-chat-bubble ai-msg">
                <div className="phone-bubble-avatar">
                  <Bot size={15} color="#FFFFFF" />
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
                      <Bot size={15} color="#FFFFFF" />
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
                        <span>Citizen Response</span>
                      </div>
                      <p className="phone-bubble-text">{entry.answer}</p>
                    </div>
                    <div className="phone-bubble-avatar patient-avatar">
                      <UserCircle size={15} color="#FFFFFF" />
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {/* Current Question */}
              {currentQuestion && (
                <div className="phone-chat-bubble ai-msg active-question-bubble">
                  <div className="phone-bubble-avatar">
                    <Bot size={15} color="#FFFFFF" />
                  </div>
                  <div className="phone-bubble-body">
                    <div className="phone-bubble-sender">
                      <span>MediKiosk Medical Assistant</span>
                      <button 
                        type="button" 
                        className="phone-bubble-speak-btn"
                        onClick={() => handleSpeakQuestion(currentQuestion.question)}
                        title="Listen to this question"
                      >
                        <Volume2 size={13} />
                        <span>Listen</span>
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
                          {translate('Select an option below or type/speak:')}
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
                    <Bot size={15} color="#FFFFFF" />
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
                <Mic size={14} className="voice-pulse-icon" />
                <span>{voiceNotice}</span>
              </div>
            )}

            {/* Mobile Government Input Bar */}
            <div className="phone-ai-input-bar">
              <button 
                type="button" 
                className={`phone-ai-mic-btn ${isRecording ? 'recording' : ''}`} 
                onClick={handleVoiceInput} 
                disabled={isRecording || loading}
                title={isRecording ? "Recording..." : "Speak Symptoms in Hindi/English"}
                aria-label="Speak symptoms"
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <div className="phone-ai-input-wrap">
                <input
                  type="text"
                  className="phone-ai-text-input"
                  placeholder={translate('Type symptoms (e.g. fever, headache)...')}
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
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 2.5 DOCUMENT UPLOAD SCREEN (Optional) */}
        {screen === 'doc_upload' && (
          <div className="gov-card" style={{ textAlign: 'center', padding: '26px 18px', margin: '10px 0' }}>
            <div style={{ width: '52px', height: '52px', margin: '0 auto 12px', backgroundColor: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #90caf9' }}>
              <FileUp size={26} color="#1565c0" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>
              {translate('Upload Documents (Optional)')}
            </h3>
            <p style={{ color: 'var(--gov-text-muted)', marginBottom: '18px', fontSize: '13px' }}>
              {translate('doc_upload_sub')}
            </p>

            {/* Mobile Upload Area with camera / file support */}
            <label
              htmlFor="phone-doc-upload"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '24px 16px',
                border: '2px dashed var(--gov-border-strong)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                backgroundColor: 'var(--gov-surface-subtle)',
                marginBottom: '16px'
              }}
            >
              <Upload size={28} color="var(--gov-primary)" />
              <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--gov-primary)' }}>
                {translate('Take Photo or Choose File')}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--gov-text-muted)' }}>
                JPG, PNG, PDF (Max 10MB)
              </span>
              <input
                id="phone-doc-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleDocUpload(e.target.files[0])}
                disabled={uploading}
              />
            </label>

            {uploading && (
              <div style={{ marginBottom: '12px', color: 'var(--gov-accent)', fontWeight: '600', fontSize: '12.5px' }}>
                Uploading & running OCR analysis...
              </div>
            )}

            {uploadedDocs.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--gov-text-main)', marginBottom: '6px' }}>
                  ✓ {uploadedDocs.length} document{uploadedDocs.length > 1 ? 's' : ''} attached
                </div>
                {uploadedDocs.map((doc, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      backgroundColor: 'var(--status-completed-bg)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '6px',
                      fontSize: '12px',
                      color: 'var(--status-completed)'
                    }}
                  >
                    <FileText size={14} />
                    <span style={{ flex: 1 }}>{doc.doc_type?.toUpperCase() || 'DOCUMENT'} — OCR Extracted</span>
                    <CheckCircle2 size={14} />
                  </div>
                ))}
              </div>
            )}

            <div className="phone-sticky-cta-wrap" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="gov-btn gov-btn-primary gov-btn-lg"
                style={{ width: '100%' }}
                onClick={startAiInquiry}
                disabled={loading}
              >
                {loading ? translate('Starting...') : translate('Start AI Symptom Inquiry')} <ArrowRight size={16} />
              </button>

              {uploadedDocs.length === 0 && (
                <button
                  type="button"
                  className="gov-btn gov-btn-outline"
                  style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}
                  onClick={startAiInquiry}
                  disabled={loading}
                >
                  {translate('Skip — No Documents')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. CLINICAL REPORT SCREEN */}
        {screen === 'report' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <ClipboardList size={32} color="var(--gov-primary)" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gov-primary)' }}>Clinical Intake Report</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)' }}>Your symptom assessment has been analyzed.</p>
            </div>

            {loading && !clinicalReport && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div className="ai-typing-indicator" style={{ justifyContent: 'center', marginBottom: '12px' }}><span></span><span></span><span></span></div>
                <p style={{ color: 'var(--gov-text-muted)', fontWeight: '600', fontSize: '13px' }}>Generating your report...</p>
              </div>
            )}

            {clinicalReport && (
              <>
                <div className="clinical-report-card">
                  <div className="report-section">
                    <h4><Activity size={14} /> Chief Complaint</h4>
                    <p>{clinicalReport.chief_complaint || 'General Consultation'}</p>
                  </div>
                  <div className="report-section">
                    <h4><FileText size={14} /> Summary</h4>
                    <p style={{ fontSize: '13px' }}>{clinicalReport.symptom_summary || clinicalReport.report_text_en}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
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
                  <div className="report-section" style={{ marginTop: '12px' }}>
                    <h4><Stethoscope size={14} /> Department</h4>
                    <p style={{ fontWeight: '700', color: 'var(--gov-accent)' }}>{clinicalReport.recommended_department || 'General Medicine'}</p>
                  </div>
                </div>

                <button type="button" className="gov-btn gov-btn-primary gov-btn-lg" style={{ width: '100%', marginTop: '16px' }} onClick={handleJoinQueue} disabled={loading}>
                  {loading ? 'Processing...' : 'Join OPD Queue'} <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        )}

        {/* 4. LEGACY INTAKE SCREEN (tree-based, fallback) */}
        {screen === 'intake' && currentNode && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge waiting">Node: {currentNode.id}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="button" className="gov-btn gov-btn-outline gov-btn-sm" onClick={() => handleSpeakQuestion(currentNode.question)} title="Listen">
                  <Volume2 size={13} color="var(--gov-accent)" /> <span>Listen</span>
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '6px', color: 'var(--gov-primary)' }}>
              {currentNode.question?.[currentLang] || currentNode.question?.en}
            </h3>
            {currentNode.help_text && (
              <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)', marginBottom: '16px' }}>
                {currentNode.help_text?.[currentLang] || currentNode.help_text?.en}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {currentNode.options?.map((opt) => (
                <button key={opt.id} type="button" className="gov-btn gov-btn-outline" style={{ justifyContent: 'space-between', padding: '14px 16px', textAlign: 'left', borderRadius: 'var(--radius-md)', fontSize: '14.5px', fontWeight: '600' }} onClick={() => handleAnswer(opt.id)} disabled={loading}>
                  <span>{opt.label?.[currentLang] || opt.label?.en}</span>
                  <ArrowRight size={16} color="var(--gov-primary)" />
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '18px', padding: '12px', backgroundColor: 'var(--gov-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-border)' }}>
              <button type="button" className={`gov-btn ${isRecording ? 'gov-btn-accent' : 'gov-btn-primary'} gov-btn-sm`} style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleVoiceInput} disabled={isRecording || loading}>
                {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{isRecording ? 'Listening...' : 'Speak Symptoms'}</span>
              </button>
              {voiceNotice && <div style={{ fontSize: '12px', color: 'var(--gov-accent)', marginTop: '6px', fontWeight: '600' }}>{voiceNotice}</div>}
            </div>

            <div style={{ backgroundColor: 'var(--gov-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--gov-border-strong)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: '700', fontSize: '12.5px', color: 'var(--gov-primary)' }}>
                <FileText size={15} /> <span>Upload Past Prescriptions / Lab Reports</span>
              </div>
              <input type="file" onChange={handleFileUpload} style={{ fontSize: '12px', width: '100%' }} />
              {uploading && <div style={{ fontSize: '12px', color: 'var(--gov-accent)', marginTop: '4px', fontWeight: '600' }}>Extracting OCR text...</div>}
              {uploadedDocs.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--status-completed)', marginTop: '4px', fontWeight: '600' }}>
                  ✓ {uploadedDocs.length} document(s) uploaded
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. WAITING ROOM & LIVE QUEUE */}
        {screen === 'waiting' && (
          <div>
            {yourTurnEvent && (
              <div className="call-alert-box active-call" role="alert">
                <Bell size={32} color="var(--status-completed)" style={{ margin: '0 auto 4px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--status-completed)' }}>IT IS YOUR TURN!</h3>
                <p style={{ fontSize: '15px', fontWeight: '800', margin: '4px 0', color: '#14532D' }}>{yourTurnEvent.message}</p>
                <div style={{ fontSize: '13.5px', color: '#166534', fontWeight: '700' }}>Proceed immediately to Room: {yourTurnEvent.room_number}</div>
              </div>
            )}

            <div className="waiting-room-hero">
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Official OPD Digital Queue Pass</span>
              <div className="waiting-token-circle">
                <span className="token-num">#{activeToken?.token_number || '1'}</span>
                <span className="token-label">Token</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>
                {activeToken?.department_name || caseData?.department_name || 'General OPD Consultation'}
              </div>
              <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '2px' }}>
                Status: {caseData?.status === 'in_consult' ? 'In Consultation' : 'Active in Queue'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 0' }}>
              <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: '12.5px', padding: '9px' }} onClick={() => setShowReceiptSlip(true)}>
                <Printer size={14} /> Print OPD Slip
              </button>
              <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: '12.5px', padding: '9px' }} onClick={() => setShowAbhaModal(true)}>
                <ShieldCheck size={14} color="var(--gov-accent)" /> My ABHA Card
              </button>
            </div>

            <div className="gov-card" style={{ padding: '16px', textAlign: 'center' }}>
              <Clock size={24} color="var(--gov-primary)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: '700', fontSize: '14px' }}>Real-Time Queue Tracking</div>
              <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)', marginTop: '2px' }}>
                Keep this browser open. You'll receive a call banner when the doctor summons your token.
              </p>
            </div>
          </div>
        )}

        {/* 7. HISTORY SCREEN */}
        {screen === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)' }}>Past Visits & Prescriptions</h3>
              <button type="button" className="gov-btn gov-btn-outline gov-btn-sm" onClick={() => setScreen(patientToken ? 'waiting' : 'login')}>
                <ArrowLeft size={13} /> Back
              </button>
            </div>

            {historyCases.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', textAlign: 'center', margin: '32px 0' }}>
                No past consultations found.
              </p>
            ) : (
              historyCases.map((c) => (
                <div key={c.id} className="rx-history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--gov-primary)' }}>{c.department_name || 'OPD Consultation'}</span>
                    <span className={`status-badge ${c.status}`} style={{ fontSize: '10.5px' }}>{c.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)' }}>
                    Chief Complaint: {c.chief_complaint || 'Routine Examination'}
                  </div>
                  {c.prescription_id && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--gov-border)', fontSize: '12.5px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--status-completed)' }}>
                        ✓ Prescription Issued by {c.doctor_name || 'Attending Doctor'}
                      </div>
                      {c.remarks && <div style={{ marginTop: '2px', color: 'var(--gov-text-muted)' }}>Advice: {c.remarks}</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Modals */}
        {showReceiptSlip && (
          <OpdReceiptSlip token={activeToken || { token_number: 1, room_number: 'Room 102', department_name: caseData?.department_name }} hospitalName={hospitals.find(h => h.id === selectedHospitalId)?.name} onClose={() => setShowReceiptSlip(false)} />
        )}
        {showAbhaModal && (
          <AbhaCardModal abhaId={abhaProfile?.abha_number || patientData?.abha_id} patientPhone={linkedPhone || phone} patientName={abhaProfile?.name || patientData?.name} onClose={() => setShowAbhaModal(false)} />
        )}
        </div>

        {/* Modal: "ⓘ ABHA क्या है?" Simple 2-Line Educational Dialog */}
        {showWhatIsAbha && (
          <div className="gov-modal-backdrop" onClick={() => setShowWhatIsAbha(false)} role="dialog" aria-modal="true">
            <div className="gov-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--gov-border)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gov-primary)' }}>
                  {translate('What is ABHA?')}
                </h3>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  onClick={() => setShowWhatIsAbha(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--gov-text-main)', marginBottom: '18px' }}>
                {translate('what_is_abha_desc')}
              </p>
              <button
                type="button"
                className="gov-btn gov-btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowWhatIsAbha(false)}
              >
                {translate('Understood')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
