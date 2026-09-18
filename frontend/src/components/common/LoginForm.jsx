import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Mic, ArrowRight, Info, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { startSpeechRecognition } from '../../utils/speechHelper';

/**
 * LoginForm — Shared Patient Authentication Form (ABHA or Mobile)
 * Compliant with Patient-First Minimalism:
 * - Single decision / single field focus
 * - Large touch targets (min 56px inputs, 64px CTA buttons)
 * - Large high-contrast typography (18-20px body/inputs)
 * - Bhashini voice mic button on every text field
 * - "ABHA nahi hai? Yahan banayein" plain visible link
 * - "ⓘ ABHA kya hai?" info dialog (no marketing fluff)
 * - Sticky Proceed button with disabled helper-text
 */
export default function LoginForm({
  method = 'abha', // 'abha' | 'mobile'
  value = '',
  onChange,
  onSubmit,
  loading = false,
  onChangeMethod,
  onCreateAbhaClick,
  isPhoneView = false
}) {
  const { language, translate } = useLanguage();
  const isHi = language === 'hi';
  const [showWhatIsAbha, setShowWhatIsAbha] = useState(false);

  const isValid = method === 'abha' 
    ? value.trim().length >= 3 
    : value.replace(/\D/g, '').length === 10;

  const getHelperText = () => {
    if (isValid) return null;
    if (method === 'abha') {
      return translate('Please enter a valid ABHA number or address');
    }
    return translate('Please enter a 10-digit mobile number');
  };

  const handleVoiceInput = () => {
    startSpeechRecognition(
      (text) => {
        if (method === 'mobile') {
          const digits = text.replace(/\D/g, '').slice(0, 10);
          if (digits) onChange(digits);
        } else {
          onChange(text.trim());
        }
      },
      isHi ? 'hi' : 'en'
    );
  };

  return (
    <div className={`gov-login-form-container ${isPhoneView ? 'phone-mode' : 'kiosk-mode'}`}>
      {/* Context Banner */}
      <div className="gov-login-context-banner">
        <div className="gov-login-context-badge">
          {method === 'abha' ? (
            <ShieldCheck size={22} color="#FFFFFF" aria-hidden="true" />
          ) : (
            <Smartphone size={22} color="#FFFFFF" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="gov-login-context-title">
            {method === 'abha' 
              ? translate('Verify via ABHA ID')
              : translate('Verify via Mobile Number')}
          </h2>
          <p className="gov-login-context-sub">
            {method === 'abha'
              ? translate('Enter 14-digit ABHA number or address')
              : translate('Enter 10-digit mobile number')}
          </p>
        </div>
      </div>

      {/* Input Field Section */}
      <div className="gov-login-form-body">
        {method === 'abha' ? (
          <div className="gov-input-group">
            <label htmlFor="patient-abha-input" className="gov-field-label">
              {translate('ABHA Number or Address')}
            </label>
            <div className="gov-input-voice-wrap">
              <input
                id="patient-abha-input"
                type="text"
                className="gov-input gov-main-input touch-target-lg"
                placeholder={isHi ? '12-3456-7890-1234 या user@abdm' : '14-digit ABHA or user@abdm'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="gov-field-mic-btn"
                onClick={handleVoiceInput}
                title={translate('Speak ABHA Number')}
                aria-label={translate('Speak ABHA Number')}
              >
                <Mic size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="gov-input-group">
            <label htmlFor="patient-mobile-input" className="gov-field-label">
              {translate('10-Digit Mobile Number')}
            </label>
            <div className="gov-input-voice-wrap">
              <span className="gov-tel-prefix" aria-hidden="true">+91</span>
              <input
                id="patient-mobile-input"
                type="tel"
                inputMode="numeric"
                className="gov-input gov-main-input gov-tel-input touch-target-lg"
                placeholder="98765 43210"
                value={value}
                maxLength={10}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoFocus
              />
              <button
                type="button"
                className="gov-field-mic-btn"
                onClick={handleVoiceInput}
                title={translate('Speak Mobile Number')}
                aria-label={translate('Speak Mobile Number')}
              >
                <Mic size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Minimalist Visible Links (ABHA only) */}
        {method === 'abha' && (
          <div className="gov-sub-links-row">
            <button
              type="button"
              className="gov-plain-link"
              onClick={onCreateAbhaClick}
            >
              {translate("Don't have an ABHA? Create here")}
            </button>
            <button
              type="button"
              className="gov-info-trigger"
              onClick={() => setShowWhatIsAbha(true)}
              title={translate('What is ABHA?')}
              aria-label={translate('What is ABHA?')}
            >
              <Info size={14} aria-hidden="true" />
              <span>{translate('What is ABHA?')}</span>
            </button>
          </div>
        )}

        {/* Change Method Button */}
        {onChangeMethod && (
          <div className="gov-change-method-row">
            <button
              type="button"
              className="gov-secondary-back-link"
              onClick={onChangeMethod}
            >
              ← {translate('Choose another method')}
            </button>
          </div>
        )}
      </div>

      {/* Sticky Proceed CTA */}
      <div className="gov-sticky-cta-wrap">
        {!isValid && (
          <div className="gov-btn-helper-text" role="status">
            {getHelperText()}
          </div>
        )}
        <button
          type="button"
          className="gov-btn gov-btn-primary gov-btn-touch"
          onClick={onSubmit}
          disabled={loading || !isValid}
        >
          <span>
            {loading 
              ? translate('Verifying...') 
              : translate('Proceed')}
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Modal: "ⓘ ABHA क्या है?" Simple 2-Line Educational Dialog */}
      {showWhatIsAbha && (
        <div 
          className="gov-modal-backdrop" 
          onClick={() => setShowWhatIsAbha(false)} 
          role="dialog" 
          aria-modal="true"
        >
          <div className="gov-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="gov-modal-header">
              <h3>{translate('What is ABHA?')}</h3>
              <button
                type="button"
                className="gov-modal-close-btn"
                onClick={() => setShowWhatIsAbha(false)}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="gov-modal-body-text">
              {translate('what_is_abha_desc')}
            </p>
            <button
              type="button"
              className="gov-btn gov-btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowWhatIsAbha(false)}
            >
              {translate('Understood')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
