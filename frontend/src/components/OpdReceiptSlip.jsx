import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, CheckCircle2, Building2 } from 'lucide-react';

export default function OpdReceiptSlip({ token, hospitalName, onClose }) {
  if (!token) return null;

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
          <h3 id="opd-slip-title" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)' }}>
            Official OPD Consultation Queue Slip
          </h3>
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
              Ministry of Health & Family Welfare / Ministry of Ayush
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
              OPD Queue Token Number
            </div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--gov-primary)', lineHeight: 1.1, margin: '4px 0' }}>
              #{token.token_number}
            </div>
            {token.priority && (
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--status-priority)', marginTop: '2px' }}>
                [TRIAGE PRIORITY APPOINTMENT]
              </div>
            )}
          </div>

          {/* Details Table */}
          <div style={{ textAlign: 'left', fontSize: '13px', margin: '12px 0', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Allocated Room:</span>
              <span style={{ fontWeight: '800', color: 'var(--gov-accent)' }}>{token.room_number || 'OPD Waiting Room'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Department:</span>
              <span style={{ fontWeight: '700' }}>{token.department_name || 'General OPD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Date & Time:</span>
              <span style={{ fontWeight: '600' }}>{currentDate}, {currentTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gov-text-muted)' }}>Physical Status:</span>
              <span style={{ fontWeight: '700', color: 'var(--status-completed)' }}>PRESENCE VERIFIED</span>
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
              Verify at Doctor Room / Pharmacy Counter
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
            Close
          </button>
          <button 
            type="button"
            className="gov-btn gov-btn-primary" 
            style={{ flex: 1 }}
            onClick={printSlip}
          >
            <Printer size={15} /> Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}
