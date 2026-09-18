import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, Volume2, X, ShieldCheck, CheckCircle2, 
  ExternalLink, User, Smartphone, Lock, ArrowRight, 
  HelpCircle, Info, Stethoscope, ShieldAlert, Zap, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Generates a random 6-character alphanumeric captcha
 */
function generateCaptchaCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Draws distorted captcha text on a Canvas to replicate standard Indian Govt ORS Portal Captcha
 * Themed with MediKiosk Deep Teal Institutional Palette
 */
function drawCaptchaToCanvas(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Background
  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(0, 0, width, height);

  // Background noise dots
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = ['#cbd5e1', '#94a3b8', '#80c5bf', '#bbf7d0'][Math.floor(Math.random() * 4)];
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wavy crossing lines (Deep Teal subtle)
  ctx.strokeStyle = '#80c5bf';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, height / 2 + (Math.random() * 10 - 5));
  ctx.bezierCurveTo(
    width / 3, Math.random() * height, 
    (2 * width) / 3, Math.random() * height, 
    width, height / 2 + (Math.random() * 10 - 5)
  );
  ctx.stroke();

  // Draw each character with slight rotation and distortion in Deep Teal palette
  const colors = ['#074e48', '#0b6b63', '#0f766e', '#115e59', '#134e4a'];
  ctx.font = 'bold 24px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  ctx.textBaseline = 'middle';

  const charSpacing = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    ctx.save();
    const x = charSpacing * (i + 0.8) + (Math.random() * 4 - 2);
    const y = height / 2 + (Math.random() * 6 - 3);
    const angle = (Math.random() * 24 - 12) * (Math.PI / 180);

    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillText(char, -8, 0);
    ctx.restore();
  }
}

export default function OrsLoginCard({
  title = "Login",
  subtitle = "Online Registration System • Patient OPD Identity Verification",
  defaultTab = "abha", // 'abha' | 'mobile' | 'rapid' | 'staff'
  role = null,         // 'doctor' | 'admin' | null
  onProceed,           // callback on successful captcha and credential validation
  onSuccess,           // callback when full login completes
  isModal = false,
  onClose,
  hospitalId
}) {
  const { selectedHospitalId, loginStaff } = useAuth();
  const { translate } = useLanguage();
  const currentHospitalId = hospitalId || selectedHospitalId;

  // Tabs state: 'abha' | 'mobile' | 'rapid' | 'staff'
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Form Inputs
  const [identifierType, setIdentifierType] = useState('address'); // 'address' | 'number'
  const [abhaInput, setAbhaInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  // Rapid Walk-In Form Inputs
  const [walkinName, setWalkinName] = useState('');
  const [walkinAge, setWalkinAge] = useState('');
  const [walkinGender, setWalkinGender] = useState('Male');
  const [walkinPhone, setWalkinPhone] = useState('');

  // Staff Login Inputs (for doctor / admin mode)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Captcha State
  const [captchaType, setCaptchaType] = useState('image'); // 'image' | 'audio'
  const [currentCaptcha, setCurrentCaptcha] = useState(generateCaptchaCode);
  const canvasRef = useRef(null);

  // Status & Notifications
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modals for "Create ABHA" and "Benefits of ABHA"
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Redraw canvas whenever currentCaptcha changes or tab switches
  useEffect(() => {
    if (canvasRef.current) {
      drawCaptchaToCanvas(canvasRef.current, currentCaptcha);
    }
  }, [currentCaptcha, activeTab]);

  const refreshCaptcha = () => {
    const newCode = generateCaptchaCode();
    setCurrentCaptcha(newCode);
    setCaptchaInput('');
    setError(null);
  };

  // Play audio readout of the captcha
  const playAudioCaptcha = () => {
    if (!window.speechSynthesis) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const charsSpaced = currentCaptcha.split('').map(c => {
      if (c === c.toUpperCase() && isNaN(c)) return `Capital ${c}`;
      return c;
    }).join('. ');

    const utterance = new SpeechSynthesisUtterance(`Captcha is: ${charsSpaced}`);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  // Check if Proceed button can be enabled
  const isFormValid = () => {
    const isCaptchaValid = captchaInput.trim().length === 6;

    if (activeTab === 'abha') {
      return abhaInput.trim().length >= 3 && isCaptchaValid;
    } else if (activeTab === 'mobile') {
      const digits = mobileInput.replace(/\D/g, '');
      return digits.length === 10 && isCaptchaValid;
    } else if (activeTab === 'rapid') {
      return walkinName.trim().length >= 2 && Boolean(walkinAge) && isCaptchaValid;
    } else if (activeTab === 'staff') {
      return staffEmail.trim().length >= 3 && staffPassword.length >= 4 && isCaptchaValid;
    }
    return false;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    // 1. Verify Captcha
    if (captchaInput.trim().toLowerCase() !== currentCaptcha.toLowerCase()) {
      setError('Invalid captcha characters entered. Please check characters and try again.');
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'staff') {
        // Staff / Doctor / Admin Login
        const res = await loginStaff(staffEmail, staffPassword);
        if (onSuccess) onSuccess(res);
        if (isModal && onClose) onClose();
      } else if (activeTab === 'rapid') {
        // Rapid Walk-in Patient (Instant OPD token without ABHA)
        const effectivePhone = walkinPhone.replace(/\D/g, '') || '9876543210';
        const profile = {
          name: walkinName.trim(),
          age: parseInt(walkinAge, 10) || 30,
          gender: walkinGender || 'Other',
          phone: effectivePhone,
          abha_number: `WALKIN-${Date.now().toString().slice(-6)}`,
          is_walkin: true
        };

        if (onProceed) {
          onProceed({
            identifier: profile.abha_number,
            identifierType: 'walkin',
            profile,
            linkedPhone: effectivePhone,
            message: 'Walk-In OPD Registration Successful'
          });
        }

        if (isModal && onClose) onClose();
      } else {
        // Patient ABHA or Mobile Login
        const targetIdentifier = activeTab === 'abha' ? abhaInput.trim() : mobileInput.replace(/\D/g, '');
        const targetType = activeTab === 'abha' ? (identifierType === 'address' ? 'abha_address' : 'abha_number') : 'mobile';

        // Call backend ABHA verification
        const res = await api.post('/intake/verify-abha', {
          identifier: targetIdentifier,
          identifier_type: targetType
        });

        const linkedPhone = res.linked_phone || res.profile?.phone || targetIdentifier.replace(/\D/g, '').slice(-10);

        if (onProceed) {
          onProceed({
            identifier: targetIdentifier,
            identifierType: targetType,
            profile: res.profile,
            linkedPhone,
            message: res.message
          });
        }

        if (isModal && onClose) {
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your credentials.');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click login helper for Doctor / Admin roles
  const handleQuickStaffLogin = async (email) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginStaff(email, 'Password@123');
      if (onSuccess) onSuccess(res);
      if (isModal && onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="ors-login-card" role="region" aria-label="ORS Login System">
      {/* 1. Header Banner — Deep Teal with White Text */}
      <div className="ors-login-header">
        <h2 className="ors-login-title">{title}</h2>
        <p className="ors-login-subtitle">{subtitle}</p>
        {isModal && onClose && (
          <button 
            type="button" 
            className="ors-modal-close-btn" 
            onClick={onClose}
            aria-label="Close Login Dialog"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 2. Top Tabs — Clean Government Option Selection */}
      <div className="ors-tabs-container" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'abha'}
          className={`ors-tab-btn ${activeTab === 'abha' ? 'active' : ''}`}
          onClick={() => { setActiveTab('abha'); setError(null); }}
        >
          <ShieldCheck size={16} />
          <span>{translate('Using ABHA (Health ID)')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mobile'}
          className={`ors-tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
          onClick={() => { setActiveTab('mobile'); setError(null); }}
        >
          <Smartphone size={16} />
          <span>{translate('Using Mobile Number')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rapid'}
          className={`ors-tab-btn ${activeTab === 'rapid' ? 'active' : ''}`}
          onClick={() => { setActiveTab('rapid'); setError(null); }}
          title="Instant Walk-In OPD Token without ABHA"
        >
          <Zap size={16} color="#D97706" />
          <span>{translate('Rapid Walk-In Token')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'staff'}
          className={`ors-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => { setActiveTab('staff'); setError(null); }}
        >
          {role === 'doctor' ? <Stethoscope size={16} /> : <Lock size={16} />}
          <span>{role === 'doctor' ? translate('Clinical Sign-In') : role === 'admin' ? translate('Admin Sign-In') : translate('Doctor / Staff Sign-In')}</span>
        </button>
      </div>

      {/* 3. Card Body — Scrollable so content fits while keeping footer pinned */}
      <div className="ors-card-body">
        {/* Error Alert — Compact & High Visibility */}
        {error && (
          <div className="ors-alert ors-alert-error" role="alert">
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form id="ors-login-form" onSubmit={handleSubmit}>
          {/* TAB 1: Using ABHA */}
          {activeTab === 'abha' && (
            <div>
              {/* Radio Selector */}
              <div className="ors-radio-row">
                <label className="ors-radio-label">
                  <input
                    type="radio"
                    name="abha_id_type"
                    checked={identifierType === 'address'}
                    onChange={() => setIdentifierType('address')}
                  />
                  <span>{translate('Using ABHA Address')}</span>
                </label>
                <label className="ors-radio-label">
                  <input
                    type="radio"
                    name="abha_id_type"
                    checked={identifierType === 'number'}
                    onChange={() => setIdentifierType('number')}
                  />
                  <span>{translate('Using ABHA Number')}</span>
                </label>
              </div>

              {/* Input: ABHA Identifier */}
              <div className="ors-input-group">
                <input
                  type="text"
                  className="ors-text-input"
                  placeholder={identifierType === 'address' ? "ABHA / ABHA Address (e.g. user@abdm)" : "14-digit ABHA (e.g. 91-8844-3322-1100)"}
                  value={abhaInput}
                  onChange={(e) => setAbhaInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 2: Using Mobile Number */}
          {activeTab === 'mobile' && (
            <div>
              <div className="ors-radio-row">
                <label className="ors-radio-label">
                  <input
                    type="radio"
                    name="mobile_type"
                    checked={true}
                    readOnly
                  />
                  <span>{translate('Using Mobile Number')}</span>
                </label>
              </div>

              <div className="ors-input-group">
                <input
                  type="tel"
                  className="ors-text-input"
                  placeholder={translate('Enter 10-Digit Mobile Number')}
                  value={mobileInput}
                  maxLength={10}
                  onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 3: Rapid Walk-In Token */}
          {activeTab === 'rapid' && (
            <div>
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#92400E' }}>
                <strong>Emergency / Walk-in Registration:</strong> For patients without an ABHA card or mobile phone, generate an instant verified walk-in OPD token.
              </div>

              <div className="ors-input-group">
                <input
                  type="text"
                  className="ors-text-input"
                  placeholder="Patient Full Name *"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="ors-input-group" style={{ marginBottom: 0 }}>
                  <input
                    type="number"
                    className="ors-text-input"
                    placeholder="Age (Years) *"
                    value={walkinAge}
                    onChange={(e) => setWalkinAge(e.target.value.slice(0, 3))}
                    min="1"
                    max="120"
                    required
                  />
                </div>
                <div className="ors-input-group" style={{ marginBottom: 0 }}>
                  <select
                    className="ors-text-input"
                    value={walkinGender}
                    onChange={(e) => setWalkinGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="ors-input-group">
                <input
                  type="tel"
                  className="ors-text-input"
                  placeholder="Contact Phone (Optional)"
                  value={walkinPhone}
                  maxLength={10}
                  onChange={(e) => setWalkinPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </div>
          )}

          {/* TAB 4: Staff Login (Doctor / Admin) */}
          {activeTab === 'staff' && (
            <div>
              {/* 1-Click Quick Duty Credentials */}
              <div className="ors-staff-quick-box">
                <div className="ors-staff-quick-title">
                  Quick Duty Credentials:
                </div>
                {role === 'doctor' ? (
                  <div className="ors-staff-quick-grid">
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('dr.ananya@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>AYUSH Vaidya</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Room 102</div>
                      </div>
                      <ArrowRight size={13} color="#0b6b63" />
                    </button>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('dr.vikram@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>GenMed Officer</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Room 105</div>
                      </div>
                      <ArrowRight size={13} color="#0b6b63" />
                    </button>
                  </div>
                ) : role === 'admin' ? (
                  <div className="ors-staff-quick-grid">
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('admin@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>Hospital Admin</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Civil Facility</div>
                      </div>
                      <ArrowRight size={13} color="#0b6b63" />
                    </button>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('superadmin@medikiosk.gov.in')}
                    >
                      <div>
                        <strong>Super Admin</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Central Portal</div>
                      </div>
                      <ArrowRight size={13} color="#0b6b63" />
                    </button>
                  </div>
                ) : (
                  <div className="ors-staff-quick-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('dr.ananya@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>AYUSH Vaidya</strong>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Doctor Room 102</div>
                      </div>
                      <ArrowRight size={12} color="#0b6b63" />
                    </button>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('dr.vikram@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>GenMed Officer</strong>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Doctor Room 105</div>
                      </div>
                      <ArrowRight size={12} color="#0b6b63" />
                    </button>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('admin@civildistrict.gov.in')}
                    >
                      <div>
                        <strong>Hospital Admin</strong>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Facility Lead</div>
                      </div>
                      <ArrowRight size={12} color="#0b6b63" />
                    </button>
                    <button
                      type="button"
                      className="ors-staff-quick-btn"
                      onClick={() => handleQuickStaffLogin('superadmin@medikiosk.gov.in')}
                    >
                      <div>
                        <strong>Super Admin</strong>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>National System</div>
                      </div>
                      <ArrowRight size={12} color="#0b6b63" />
                    </button>
                  </div>
                )}
              </div>

              <div className="ors-input-group">
                <input
                  type="email"
                  className="ors-text-input"
                  placeholder="Institutional Email Address"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="ors-input-group">
                <input
                  type="password"
                  className="ors-text-input"
                  placeholder="Official Security Password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Security Captcha Characters Input with 0/6 Counter */}
          <div className="ors-input-group" style={{ marginBottom: '8px' }}>
            <input
              type="text"
              className="ors-text-input"
              placeholder={translate('Enter Characters Displayed')}
              value={captchaInput}
              maxLength={6}
              onChange={(e) => setCaptchaInput(e.target.value.slice(0, 6))}
              required
            />
            <span className="ors-char-counter">
              {captchaInput.length}/6
            </span>
          </div>

          {/* Captcha Type Selector (Image / Audio) */}
          <div className="ors-captcha-type-row">
            <label className="ors-captcha-radio">
              <input
                type="radio"
                name="captcha_type"
                checked={captchaType === 'image'}
                onChange={() => setCaptchaType('image')}
              />
              <span>{translate('Image Captcha')}</span>
            </label>
            <label className="ors-captcha-radio">
              <input
                type="radio"
                name="captcha_type"
                checked={captchaType === 'audio'}
                onChange={() => setCaptchaType('audio')}
              />
              <span>{translate('Audio Captcha')}</span>
            </label>
          </div>

          {/* Captcha Display & Refresh */}
          <div className="ors-captcha-display-row">
            <div className="ors-captcha-canvas-box">
              <canvas
                ref={canvasRef}
                width={150}
                height={42}
                className="ors-captcha-canvas"
                title="Security Captcha"
              />
            </div>

            <button
              type="button"
              className="ors-captcha-refresh-btn"
              onClick={refreshCaptcha}
              title={translate('Refresh Captcha')}
            >
              <RotateCw size={18} />
            </button>

            {captchaType === 'audio' && (
              <button
                type="button"
                className="ors-captcha-audio-btn"
                onClick={playAudioCaptcha}
                title={translate('Listen Captcha')}
              >
                <Volume2 size={15} />
                <span>{translate('Listen Captcha')}</span>
              </button>
            )}
          </div>

          {/* Helper Link: Don't have ABHA? Create Here */}
          {activeTab !== 'staff' && (
            <div className="ors-link-row">
              <button
                type="button"
                className="ors-action-link"
                onClick={() => setShowCreateModal(true)}
              >
                {translate('Dont have ABHA')}
              </button>
            </div>
          )}
        </form>

      </div>

      {/* Proceed Button — Pinned Sticky Footer (NEVER Hidden by Errors or Scroll) */}
      <div className="ors-card-footer">
        <button
          type="submit"
          form="ors-login-form"
          disabled={!isFormValid() || loading}
          className={`ors-proceed-btn ${isFormValid() && !loading ? 'active' : 'disabled'}`}
        >
          {loading ? translate('Processing...') : translate('Proceed')}
        </button>
      </div>

      {/* MODAL 2: Create ABHA Fast Setup */}
      {showCreateModal && (
        <div className="ors-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ors-info-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#0b6b63" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#074e48', margin: 0 }}>
                  Generate New ABHA Health ID
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
              You can instantly generate your 14-digit ABHA card using your 10-digit mobile number or Aadhaar verification.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Quick Instant Demo ABHA:
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                Try <strong>ramesh.kumar@abdm</strong> or mobile <strong>9876543210</strong> to test instant verified check-in.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="ors-proceed-btn active"
                style={{ flex: 1 }}
                onClick={() => {
                  setAbhaInput('ramesh.kumar@abdm');
                  setIdentifierType('address');
                  setShowCreateModal(false);
                }}
              >
                Auto-Fill Demo ABHA
              </button>
              <button
                type="button"
                className="ors-proceed-btn disabled"
                style={{ width: 'auto', padding: '0 16px' }}
                onClick={() => setShowCreateModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="ors-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div className="ors-modal-dialog-box" onClick={(e) => e.stopPropagation()}>
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="ors-login-wrapper">
      {cardContent}
    </div>
  );
}
