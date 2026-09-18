import React from 'react';
import { ShieldCheck, Smartphone, Lock, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * LoginMethodSelector — Single-Decision Patient Check-In Selection Screen
 * Replaces the old 4-tab ORS login for patient kiosk flow.
 * Shows 2 large icon cards: ABHA/Health ID vs Mobile Number.
 */
export default function LoginMethodSelector({ 
  onSelectMethod, 
  title, 
  subtitle 
}) {
  const { translate } = useLanguage();

  const defaultTitle = translate('How would you like to check in?');
  const defaultSub = translate('Choose your registration method below');

  return (
    <div className="login-method-selector" role="region" aria-label="Patient Check-In Method Selection">
      <h2 className="login-method-title">
        {title || defaultTitle}
      </h2>
      <p className="login-method-title-sub">
        {subtitle || defaultSub}
      </p>

      <div className="login-method-cards">
        {/* Card 1: ABHA / Health ID */}
        <div
          role="button"
          tabIndex={0}
          className="login-method-card"
          onClick={() => onSelectMethod('abha')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectMethod('abha'); }}
          aria-label="Check in using ABHA or Health ID"
        >
          <div className="login-method-card-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="login-method-card-text">
            <h3>{translate('ABHA / Health ID')}</h3>
            <p>{translate('Login with ABHA Number or ABHA Address')}</p>
          </div>
          <ChevronRight size={24} color="#0B1F3A" />
        </div>

        {/* Card 2: Mobile Number */}
        <div
          role="button"
          tabIndex={0}
          className="login-method-card"
          onClick={() => onSelectMethod('mobile')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectMethod('mobile'); }}
          aria-label="Check in using Mobile Number"
        >
          <div className="login-method-card-icon">
            <Smartphone size={28} />
          </div>
          <div className="login-method-card-text">
            <h3>{translate('Using Mobile Number')}</h3>
            <p>{translate('Login with 10-digit mobile number and OTP')}</p>
          </div>
          <ChevronRight size={24} color="#0B1F3A" />
        </div>
      </div>

      {/* Trust Signal */}
      <div className="login-method-trust-line">
        <Lock size={13} color="#046A38" />
        <span>{translate('Your information is confidential and secure')}</span>
      </div>
    </div>
  );
}
