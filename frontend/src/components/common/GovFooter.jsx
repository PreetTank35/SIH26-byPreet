import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function GovFooter() {
  const { translate } = useLanguage();

  // Dynamic current date formatted in Indian standard format
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <footer className="gov-official-footer" role="contentinfo" aria-label="Official Government Footer">
      <div className="gov-footer-compact-container">
        {/* Row 1: Mandatory NIC Links + Inline Security/Trust Badges */}
        <div className="gov-footer-row-1">
          <nav className="gov-footer-links-row" aria-label="Government Mandatory Links">
            <a href="#rti" onClick={(e) => { e.preventDefault(); alert('Right to Information (RTI) portal: rti.gov.in'); }}>
              {translate('RTI')}
            </a>
            <span className="gov-footer-sep">|</span>
            <a href="#sitemap" onClick={(e) => { e.preventDefault(); alert('Portal Sitemap: All OPD Terminal modules indexed.'); }}>
              {translate('Sitemap')}
            </a>
            <span className="gov-footer-sep">|</span>
            <a href="#contact" onClick={(e) => { e.preventDefault(); alert('Helpline: 1800-11-2233 | support-medikiosk@ayush.gov.in'); }}>
              {translate('Contact Us')}
            </a>
            <span className="gov-footer-sep">|</span>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy: Patient health records are strictly encrypted & ABHA-linked.'); }}>
              {translate('Privacy Policy')}
            </a>
            <span className="gov-footer-sep">|</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Use: Official hospital OPD patient intake screening.'); }}>
              {translate('Terms of Use')}
            </a>
            <span className="gov-footer-sep">|</span>
            <a href="#accessibility" onClick={(e) => { e.preventDefault(); alert('Accessibility: Compliant with GIGW 3.0 & WCAG 2.2 AA.'); }}>
              {translate('Accessibility Statement')}
            </a>
          </nav>

          <div className="gov-footer-trust-inline">
            <span className="gov-trust-micro" title="SSL Encrypted 256-bit">
              <Lock size={11} className="gov-trust-icon" aria-hidden="true" />
              <span>{translate('SSL 256-Bit')}</span>
            </span>
            <span className="gov-footer-sep">•</span>
            <span className="gov-trust-micro" title="Data confidentiality compliant with DPDP Act 2023">
              <ShieldCheck size={11} className="gov-trust-icon" aria-hidden="true" />
              <span>{translate('DPDP Act 2023 Compliant')}</span>
            </span>
          </div>
        </div>

        {/* Row 2: Attribution, Copyright & Flat Visitor Counter */}
        <div className="gov-footer-row-2">
          <div className="gov-footer-credits">
            <span>
              {translate('Website Content Managed by')}{' '}
              <strong>{translate('Ministry of AYUSH, Govt. of India')}</strong>
            </span>
            <span className="gov-footer-sep">|</span>
            <span>
              {translate('Hosted by')}{' '}
              <strong>{translate('National Informatics Centre (NIC)')}</strong>
            </span>
            <span className="gov-footer-sep">|</span>
            <span>© 2026 MediKiosk</span>
            <span className="gov-footer-sep">•</span>
            <span className="gov-footer-updated">
              {translate('Updated:')} {todayFormatted}
            </span>
          </div>

          <div className="gov-visitor-counter-compact" aria-label="Portal visitor count: 01482920">
            <span className="gov-counter-label-compact">{translate('Visitors:')}</span>
            <div className="gov-counter-digits-compact" aria-hidden="true">
              <span className="gov-digit-sm">0</span>
              <span className="gov-digit-sm">1</span>
              <span className="gov-digit-sm">,</span>
              <span className="gov-digit-sm">4</span>
              <span className="gov-digit-sm">8</span>
              <span className="gov-digit-sm">2</span>
              <span className="gov-digit-sm">,</span>
              <span className="gov-digit-sm">9</span>
              <span className="gov-digit-sm">2</span>
              <span className="gov-digit-sm">0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

