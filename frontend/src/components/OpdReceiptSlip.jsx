import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, CheckCircle2, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function OpdReceiptSlip({ token, hospitalName, onClose }) {
  if (!token) return null;
  const { language, translate } = useLanguage();

  const printSlip = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="gov-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="opd-slip-title">
      <div className="gov-modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 id="opd-slip-title" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)', margin: 0 }}>
              Official OPD Consultation Queue Slip
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginTop: '2px' }}>
              आधिकारिक ओपीडी परामर्श कतार पर्ची
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gov-text-muted)', padding: '4px' }}
            aria-label="Close Queue Slip"
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div 
          id="printable-opd-slip"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px dashed var(--gov-border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--gov-text-main)'
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid var(--gov-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gov-text-muted)' }}>
              Ministry of Health & Family Welfare • स्वास्थ्य एवं परिवार कल्याण मंत्रालय
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--gov-primary)', marginTop: '4px' }}>
              {hospitalName || 'District Civil & AYUSH Hospital'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--gov-text-subtle)', marginTop: '2px' }}>
              National Health Mission • Smart OPD Intake & Triage
            </div>
          </div>

          {/* Token Big Display */}
          <div style={{ margin: '14px 0', padding: '14px', backgroundColor: 'var(--gov-primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-primary-border)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: 'var(--gov-primary)', letterSpacing: '0.5px' }}>
              OPD Queue Token Number • ओपीडी टोकन संख्या
            </div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--gov-primary)', lineHeight: 1.1, margin: '4px 0' }}>
              #{token.token_number}
            </div>
            {token.priority && (
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--status-priority)', marginTop: '2px' }}>
                [TRIAGE PRIORITY APPOINTMENT • प्राथमिकता नियुक्ति]
              </div>
            )}
          </div>

          {/* Details Table */}
          <div style={{ textAlign: 'left', fontSize: '13px', margin: '12px 0', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e2e8f0', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Allocated Room / कक्ष:</span>
              <span style={{ fontWeight: '800', color: 'var(--gov-accent)' }}>{token.room_number || 'OPD Waiting Room'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e2e8f0', padding: '4px 0' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Department / विभाग:</span>
              <span style={{ fontWeight: '700' }}>{token.department_name || 'General OPD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e2e8f0', padding: '4px 0' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Date & Time / दिनांक:</span>
              <span style={{ fontWeight: '600' }}>{currentDate}, {currentTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Status / स्थिति:</span>
              <span style={{ fontWeight: '700', color: 'var(--status-completed)' }}>VERIFIED • सत्यापित</span>
            </div>
          </div>

          {/* QR & Verification */}
          <div style={{ marginTop: '14px', borderTop: '1px solid var(--gov-border)', paddingTop: '12px' }}>
            <QRCodeSVG 
              value={`TOKEN:${token.id || token.token_number}:${token.token_date || currentDate}`} 
              size={96}
              level="M"
              style={{ margin: '0 auto' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--gov-text-subtle)', marginTop: '8px' }}>
              Verify at Doctor Room / Pharmacy Counter<br/>
              डॉक्टर कक्ष या फार्मेसी काउंटर पर स्कैन करवाएं
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button 
            type="button"
            className="gov-btn gov-btn-outline" 
            style={{ flex: 1 }}
            onClick={onClose}
          >
            {translate('close') || 'Close'}
          </button>
          <button 
            type="button"
            className="gov-btn gov-btn-primary" 
            style={{ flex: 1 }}
            onClick={printSlip}
          >
            <Printer size={15} /> {translate('print') || 'Print Slip'}
          </button>
        </div>
      </div>
    </div>
  );
}
