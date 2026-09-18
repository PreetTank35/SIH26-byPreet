import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, X, Download, Building2, CheckCircle2, Printer } from 'lucide-react';

export default function AbhaCardModal({ abhaId, patientName, patientPhone, onClose }) {
  const displayAbhaNumber = abhaId || '91-8844-3322-1100';
  const displayAbhaAddress = `${patientPhone || 'user'}@abdm`;

  return (
    <div className="gov-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="abha-modal-title">
      <div className="gov-modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--gov-accent)" />
            <h3 id="abha-modal-title" style={{ fontSize: '17px', fontWeight: '800', color: 'var(--gov-primary)' }}>
              Ayushman Bharat Digital Health Account
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gov-text-muted)', padding: '4px' }}
            aria-label="Close ABHA Card Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Standard National ABHA Card Specification */}
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--gov-primary)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {/* Official National Header Bar */}
          <div style={{ backgroundColor: 'var(--gov-primary)', color: '#FFFFFF', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                National Health Authority (NHA)
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.3px', marginTop: '1px' }}>
                ABHA • आयुष्मान भारत
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--gov-accent)', color: '#FFFFFF', fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontWeight: '800', letterSpacing: '0.5px' }}>
              VERIFIED
            </div>
          </div>

          {/* Tricolor Indicator Line */}
          <div style={{ height: '3px', display: 'flex' }}>
            <div style={{ flex: 1, backgroundColor: '#FF9933' }}></div>
            <div style={{ flex: 1, backgroundColor: '#FFFFFF' }}></div>
            <div style={{ flex: 1, backgroundColor: '#138808' }}></div>
          </div>

          {/* Card Body */}
          <div style={{ padding: '18px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--gov-text-muted)', fontWeight: '600' }}>
                Patient Name / लाभार्थी का नाम
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-text-main)', marginTop: '2px' }}>
                {patientName || 'Verified Citizen'}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--gov-text-muted)', fontWeight: '600', marginTop: '10px' }}>
                ABHA Number / आभा संख्या
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '1px', color: 'var(--gov-primary)' }}>
                {displayAbhaNumber}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--gov-text-muted)', fontWeight: '600', marginTop: '8px' }}>
                ABHA Address / आभा पता
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gov-accent)' }}>
                {displayAbhaAddress}
              </div>
            </div>

            {/* Official QR Code */}
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              padding: '6px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--gov-border-strong)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <QRCodeSVG 
                value={`ABHA:${displayAbhaNumber}:${displayAbhaAddress}`}
                size={88}
                level="M"
              />
            </div>
          </div>

          {/* Official Footer Banner */}
          <div style={{ backgroundColor: 'var(--gov-surface-subtle)', borderTop: '1px solid var(--gov-border)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--gov-text-muted)', fontWeight: '600' }}>
            <span>Ayushman Bharat Digital Mission (ABDM)</span>
            <span>Ministry of Health & Family Welfare</span>
          </div>
        </div>

        {/* Integration Callout */}
        <div style={{ marginTop: '16px', backgroundColor: 'var(--gov-primary-light)', border: '1px solid var(--gov-primary-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--gov-primary)' }}>
          <CheckCircle2 size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--status-completed)' }} />
          This ABHA identity is digitally linked to OPD visits, clinical encounters, and prescriptions across public hospitals.
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button type="button" className="gov-btn gov-btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button type="button" className="gov-btn gov-btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
            <Printer size={15} /> Print Card
          </button>
        </div>
      </div>
    </div>
  );
}
