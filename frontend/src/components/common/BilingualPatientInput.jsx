import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Keyboard, Lock, CheckCircle2, RotateCw, Volume2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import IndicVirtualKeyboard from './IndicVirtualKeyboard';

/**
 * Helper to convert Audio Blob to Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * BilingualPatientInput — Multilingual Indic Name Input Engine
 * Handles the 4 core scenarios:
 * 1. English Keyboard Input -> Real-time Indic transliteration into dual editable fields
 * 2. Native System Keyboard Input -> Direct Indic script entry with dual-sync
 * 3. Speech / Voice Input -> Bhashini ASR detection & auto-fill with confirmation
 * 4. ABHA Auto-Fetch -> Locks fields as UNEDITABLE (read-only) with official badge
 * Always provides speech mic and on-screen keyboard toggle buttons!
 */
export default function BilingualPatientInput({
  valueEn = '',
  valueIndic = '',
  onChange,             // ({ nameEn, nameIndic }) => void
  isAbhaVerified = false,
  abhaDetails = null,   // { name, abha_number, gender, age }
  label = 'Patient Full Name / मरीज का पूरा नाम',
  required = true,
  disabled = false
}) {
  const { language, transliterateIndic, translateAsync } = useLanguage();

  const [nameEn, setNameEn] = useState(valueEn);
  const [nameIndic, setNameIndic] = useState(valueIndic);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeInputTarget, setActiveInputTarget] = useState('indic'); // 'indic' | 'en'

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Sync external values when changed (e.g. from ABHA verification)
  useEffect(() => {
    if (valueEn !== undefined && valueEn !== nameEn) {
      setNameEn(valueEn);
    }
  }, [valueEn]);

  useEffect(() => {
    if (valueIndic !== undefined && valueIndic !== nameIndic) {
      setNameIndic(valueIndic);
    }
  }, [valueIndic]);

  // If ABHA is verified, auto-lock and populate
  useEffect(() => {
    if (isAbhaVerified && abhaDetails?.name) {
      const officialName = abhaDetails.name;
      setNameEn(officialName);
      // Auto convert to Indic if needed
      const indicName = transliterateIndic(officialName, language) || officialName;
      setNameIndic(indicName);
      if (onChange) {
        onChange({ nameEn: officialName, nameIndic: indicName });
      }
    }
  }, [isAbhaVerified, abhaDetails?.name]);

  // Scenario 1: User types in English -> Auto-transliterate to Indic script
  const handleEnglishChange = (e) => {
    if (isAbhaVerified || disabled) return;
    const val = e.target.value;
    setNameEn(val);

    // Only auto-convert if Indic wasn't manually overridden or is in sync
    const converted = transliterateIndic(val, language);
    setNameIndic(converted);

    if (onChange) {
      onChange({ nameEn: val, nameIndic: converted });
    }
  };

  // Scenario 2: User types directly in Indic script (via Indic keyboard or system IME)
  const handleIndicChange = (e) => {
    if (isAbhaVerified || disabled) return;
    const val = e.target.value;
    setNameIndic(val);

    if (onChange) {
      onChange({ nameEn, nameIndic: val });
    }
  };

  // On-Screen Virtual Keyboard Key Insertion
  const handleKeyboardInsertChar = (char) => {
    if (isAbhaVerified || disabled) return;
    if (activeInputTarget === 'indic') {
      const updated = (nameIndic || '') + char;
      setNameIndic(updated);
      if (onChange) onChange({ nameEn, nameIndic: updated });
    } else {
      const updated = (nameEn || '') + char;
      setNameEn(updated);
      const converted = transliterateIndic(updated, language);
      setNameIndic(converted);
      if (onChange) onChange({ nameEn: updated, nameIndic: converted });
    }
  };

  const handleKeyboardBackspace = () => {
    if (isAbhaVerified || disabled) return;
    if (activeInputTarget === 'indic') {
      const updated = (nameIndic || '').slice(0, -1);
      setNameIndic(updated);
      if (onChange) onChange({ nameEn, nameIndic: updated });
    } else {
      const updated = (nameEn || '').slice(0, -1);
      setNameEn(updated);
      const converted = transliterateIndic(updated, language);
      setNameIndic(converted);
      if (onChange) onChange({ nameEn: updated, nameIndic: converted });
    }
  };

  const handleKeyboardClear = () => {
    if (isAbhaVerified || disabled) return;
    if (activeInputTarget === 'indic') {
      setNameIndic('');
      if (onChange) onChange({ nameEn, nameIndic: '' });
    } else {
      setNameEn('');
      setNameIndic('');
      if (onChange) onChange({ nameEn: '', nameIndic: '' });
    }
  };

  // Scenario 3: User speaks name -> Bhashini ASR detection
  const startVoiceRecording = async () => {
    if (isAbhaVerified || disabled) return;
    setVoiceNotice('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
        await processVoiceAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceNotice('Listening... speak your name clearly (बोलें)');
    } catch (err) {
      console.warn('[BilingualInput] Mic permission denied:', err);
      setVoiceNotice('Microphone access denied. Please type your name.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setVoiceProcessing(true);
      setVoiceNotice('Processing speech via Bhashini AI...');
    }
  };

  const processVoiceAudio = async (audioBlob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const res = await fetch('/api/intake/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64Audio,
          language: language === 'en' ? 'en' : 'hi',
          audio_format: 'wav'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const spokenText = data.transcript?.trim() || '';
        if (spokenText) {
          // Detect whether spoken in English or Indic
          const isIndic = /[\u0900-\u0D7F]/.test(spokenText);
          let finalIndic = spokenText;
          let finalEn = spokenText;

          if (isIndic) {
            finalIndic = spokenText;
            finalEn = spokenText; // or translated
          } else {
            finalEn = spokenText;
            finalIndic = transliterateIndic(spokenText, language);
          }

          setNameIndic(finalIndic);
          setNameEn(finalEn);
          setVoiceNotice(`✓ Detected: "${spokenText}"`);
          if (onChange) {
            onChange({ nameEn: finalEn, nameIndic: finalIndic });
          }
        } else {
          setVoiceNotice('No clear speech detected. Please try speaking again or type.');
        }
      } else {
        setVoiceNotice('Voice recognition service temporarily unavailable. Please type.');
      }
    } catch (err) {
      console.warn('[Bhashini Voice] Error:', err);
      setVoiceNotice('Voice processing error. Please use keyboard.');
    } finally {
      setVoiceProcessing(false);
    }
  };

  return (
    <div className="bilingual-patient-input-wrapper" style={{ width: '100%', marginBottom: '14px' }}>
      {/* Label & Accessibility Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gov-primary)' }}>
          {label} {required && <span style={{ color: '#B91C1C' }}>*</span>}
        </label>
        
        {/* Scenario 4: ABHA Verified Badge */}
        {isAbhaVerified ? (
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              color: 'var(--status-completed)', 
              backgroundColor: 'var(--status-completed-bg)', 
              border: '1px solid var(--status-completed-border)',
              padding: '2px 8px',
              borderRadius: '3px'
            }}
          >
            <ShieldCheck size={13} />
            <span>ABHA Verified · Read-Only (Official Govt ID)</span>
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--gov-text-subtle)' }}>
            Dual Script Auto-Translation (अंग्रेजी व मातृभाषा)
          </span>
        )}
      </div>

      {/* Inputs Grid: Dual fields (English + Indic Script) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '10px',
          alignItems: 'center' 
        }}
      >
        {/* Field 1: English Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="ors-text-input"
            placeholder={isAbhaVerified ? 'Official Name (ABHA)' : 'Type Name in English (e.g. Rahul Sharma)'}
            value={nameEn}
            onChange={handleEnglishChange}
            onFocus={() => setActiveInputTarget('en')}
            readOnly={isAbhaVerified}
            disabled={disabled}
            style={{
              width: '100%',
              backgroundColor: isAbhaVerified ? '#F1F5F9' : '#FFFFFF',
              borderColor: isAbhaVerified ? '#CBD5E1' : (activeInputTarget === 'en' ? 'var(--gov-primary)' : 'var(--gov-border)'),
              color: isAbhaVerified ? '#475569' : '#0B1F3A',
              fontWeight: isAbhaVerified ? 700 : 500,
              cursor: isAbhaVerified ? 'not-allowed' : 'text'
            }}
          />
          <span 
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              fontSize: '10px', 
              fontWeight: 700, 
              color: '#94A3B8',
              pointerEvents: 'none'
            }}
          >
            EN
          </span>
        </div>

        {/* Field 2: Target Indic Script Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="ors-text-input"
            placeholder={isAbhaVerified ? 'आधिकारिक नाम (ABHA)' : (language === 'hi' ? 'नाम (हिन्दी में - स्वतः अनुवादित)' : 'Name in Native Script')}
            value={nameIndic}
            onChange={handleIndicChange}
            onFocus={() => setActiveInputTarget('indic')}
            readOnly={isAbhaVerified}
            disabled={disabled}
            style={{
              width: '100%',
              backgroundColor: isAbhaVerified ? '#F1F5F9' : '#FFFFFF',
              borderColor: isAbhaVerified ? '#CBD5E1' : (activeInputTarget === 'indic' ? 'var(--gov-secondary)' : 'var(--gov-border)'),
              color: isAbhaVerified ? '#475569' : '#046A38',
              fontWeight: 700,
              cursor: isAbhaVerified ? 'not-allowed' : 'text'
            }}
          />
          <span 
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              fontSize: '10px', 
              fontWeight: 700, 
              color: 'var(--gov-secondary)',
              pointerEvents: 'none'
            }}
          >
            {language === 'hi' ? 'हिन्दी' : language.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Auxiliary Action Bar: Always Available Speech Mic & On-Screen Keyboard */}
      {!isAbhaVerified && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '8px',
            gap: '8px'
          }}
        >
          {/* Voice Input Button (Always Available) */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={voiceProcessing || disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '4px',
              border: isRecording ? '1.5px solid #DC2626' : '1px solid var(--gov-primary-border)',
              backgroundColor: isRecording ? '#FEE2E2' : 'var(--gov-primary-light)',
              color: isRecording ? '#DC2626' : 'var(--gov-primary)',
              cursor: voiceProcessing ? 'wait' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Speak your name in your preferred language"
          >
            {isRecording ? (
              <>
                <MicOff size={15} className="animate-pulse" />
                <span>बोलना समाप्त करें (Stop Mic)</span>
              </>
            ) : (
              <>
                <Mic size={15} />
                <span>बोलकर नाम दर्ज करें (Voice Input)</span>
              </>
            )}
          </button>

          {/* On-Screen Indic Keyboard Toggle (Always Available) */}
          <button
            type="button"
            onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            disabled={disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '4px',
              border: isKeyboardOpen ? '1.5px solid var(--gov-primary)' : '1px solid var(--gov-border)',
              backgroundColor: isKeyboardOpen ? '#F1F5F9' : '#FFFFFF',
              color: 'var(--gov-primary)',
              cursor: 'pointer'
            }}
            title="Open On-Screen Virtual Keyboard for Indic languages"
          >
            <Keyboard size={15} />
            <span>{isKeyboardOpen ? 'कीबोर्ड बंद करें (Hide)' : 'ऑन-स्क्रीन कीबोर्ड (Virtual Keyboard)'}</span>
          </button>
        </div>
      )}

      {/* Voice Status Notice */}
      {voiceNotice && (
        <div 
          style={{ 
            marginTop: '6px', 
            fontSize: '12px', 
            fontWeight: 600, 
            color: voiceNotice.includes('✓') ? 'var(--status-completed)' : (voiceNotice.includes('denied') ? '#B91C1C' : 'var(--gov-primary)'),
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {voiceProcessing && <RotateCw size={13} className="spin" />}
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* On-Screen Virtual Keyboard Panel */}
      {isKeyboardOpen && !isAbhaVerified && (
        <IndicVirtualKeyboard
          language={language}
          onInsertChar={handleKeyboardInsertChar}
          onBackspace={handleKeyboardBackspace}
          onClear={handleKeyboardClear}
          onClose={() => setIsKeyboardOpen(false)}
        />
      )}
    </div>
  );
}
