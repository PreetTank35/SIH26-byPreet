import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ShieldCheck, Stethoscope, Tablet, Smartphone, 
  LogOut, User, LogIn, Eye
} from 'lucide-react';
import emblemOfIndia from '../../assets/Emblem_of_India.svg';
import ayushEmblemLogo from '../../assets/ayush-emblem-logo.png';
import medikioskLogo from '../../assets/Authoritative Logo for MediKiosk with Compassionate Symbol.jpg';
import OrsLoginCard from './OrsLoginCard';
import LanguageDropdown from './LanguageDropdown';
import TextSizeDropdown from './TextSizeDropdown';
import AnnouncementTicker from './AnnouncementTicker';

/**
 * GovHeader — Official Government of India Institutional Header
 * Compliant with GIGW 3.0 & eGov NIC Standards:
 * - Utility strip: Tricolor flag, Authority label, Screen Reader access, Text Size & Language dropdowns.
 * - Main Institutional brand block: Official MediKiosk emblem + State Emblem of India + Ayush Emblem.
 * - Rule C: Stacked dual-language allowed on main brand heading only; single-language on all nav items.
 * - Rule F: No duplicate SSL/trust badge (kept exclusively in official footer).
 */
export default function GovHeader({ activeView, onViewChange }) {
  const { staffUser, logoutStaff } = useAuth();
  const { language, translate } = useLanguage();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <header className="gov-header-wrapper" role="banner">
      {/* ═══ 1. TOP NATIONAL UTILITY STRIP (GIGW 3.0 Standard) ═══ */}
      <div className="gov-utility-strip">
        <div className="gov-utility-left">
          <div className="gov-tricolor-flag" aria-hidden="true" title="National Flag of India">
            <span></span><span></span><span></span>
          </div>
          <span className="gov-utility-label">
            {translate('govTitle')}
          </span>
          <span className="gov-utility-sep">|</span>
          <span className="gov-utility-screenreader">
            <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {translate('Screen Reader Access')}
          </span>
        </div>

        <div className="gov-utility-right">
          {/* 1. Compact Accessible Text Size Dropdown (Presets: 100%, 115%, 130%, 150%) */}
          <TextSizeDropdown />

          <span className="gov-utility-sep">|</span>

          {/* 2. Official Single Compact Language Switcher Dropdown (22 Bhashini Languages) */}
          <LanguageDropdown />

          <span className="gov-utility-sep">|</span>

          {/* User Auth Status / Sign Out or Register Pill */}
          {staffUser ? (
            <button 
              type="button"
              className="gov-utility-user-btn" 
              onClick={logoutStaff}
              title={`Logged in as ${staffUser.name} (${staffUser.role || 'Staff'}) — Click to sign out`}
            >
              <User size={13} aria-hidden="true" />
              <span>{staffUser.name.split(' ')[0]}</span>
              <LogOut size={12} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="gov-utility-login-btn"
              onClick={() => setLoginModalOpen(true)}
              title="Staff & Doctor Login • Online Registration System"
            >
              <LogIn size={13} aria-hidden="true" />
              <span>{translate('Doctor / Staff Sign-In')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ 2. MAIN INSTITUTIONAL AUTHORITY HEADER ═══ */}
      <div className="gov-header-main">
        {/* LEFTMOST: Official MediKiosk Brand Logo & Title with Bilingual Subtitle (Allowed on main heading only) */}
        <div 
          className="gov-brand-left-block" 
          onClick={() => onViewChange('kiosk')}
          role="button"
          tabIndex={0}
          title="MediKiosk Smart OPD Intake Terminal"
          onKeyDown={(e) => { if (e.key === 'Enter') onViewChange('kiosk'); }}
        >
          <div className="gov-brand-logo-frame">
            <img 
              src={medikioskLogo} 
              alt="MediKiosk Official Brand Logo" 
              className="gov-medikiosk-logo-img"
            />
          </div>
          <div className="gov-medikiosk-text-block">
            <span className="gov-medikiosk-main-title">MediKiosk</span>
            <span className="gov-medikiosk-sub-title">
              OPD Smart Intake Terminal · ओपीडी स्मार्ट पंजीकरण टर्मिनल
            </span>
          </div>
        </div>

        {/* RIGHTMOST: Official State Emblem of India (Ashoka Lion Capital) + Ministry of Ayush */}
        <div className="gov-brand-right-block">
          <div className="gov-ayush-authority-block">
            <div className="gov-ayush-title-stack">
              <span className="gov-ayush-ministry-hi">आयुष मंत्रालय</span>
              <span className="gov-ayush-ministry-en">Ministry of Ayush</span>
              <span className="gov-ayush-country">Government of India · भारत सरकार</span>
            </div>
            {/* Real National Emblem of India (Wikimedia Commons official asset) */}
            <div className="gov-national-emblem-frame" title="State Emblem of India (सत्यमेव जयते)">
              <img 
                src={emblemOfIndia} 
                alt="State Emblem of India" 
                className="gov-national-emblem-img"
              />
            </div>
            {/* Ministry of Ayush Logo */}
            <div className="gov-ayush-emblem-frame" title="Ministry of Ayush Emblem">
              <img 
                src={ayushEmblemLogo} 
                alt="Ministry of Ayush Logo" 
                className="gov-ayush-emblem-img"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 3. PRIMARY GOVERNMENT NAVIGATION BAR (Single Active Language Only per Rule C) ═══ */}
      <nav className="gov-primary-navbar" aria-label="Portal Modules Navigation">
        <div className="gov-nav-container">
          <button 
            type="button"
            className={`gov-nav-item ${activeView === 'kiosk' ? 'active' : ''}`}
            onClick={() => onViewChange('kiosk')}
            aria-current={activeView === 'kiosk' ? 'page' : undefined}
          >
            <Tablet size={16} aria-hidden="true" />
            <span className="gov-nav-label">{translate('kiosk')}</span>
          </button>
          <button 
            type="button"
            className={`gov-nav-item ${activeView === 'phone' ? 'active' : ''}`}
            onClick={() => onViewChange('phone')}
            aria-current={activeView === 'phone' ? 'page' : undefined}
          >
            <Smartphone size={16} aria-hidden="true" />
            <span className="gov-nav-label">{translate('phone')}</span>
          </button>
          <button 
            type="button"
            className={`gov-nav-item ${activeView === 'doctor' ? 'active' : ''}`}
            onClick={() => onViewChange('doctor')}
            aria-current={activeView === 'doctor' ? 'page' : undefined}
          >
            <Stethoscope size={16} aria-hidden="true" />
            <span className="gov-nav-label">{translate('doctor')}</span>
          </button>
          <button 
            type="button"
            className={`gov-nav-item ${activeView === 'admin' ? 'active' : ''}`}
            onClick={() => onViewChange('admin')}
            aria-current={activeView === 'admin' ? 'page' : undefined}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span className="gov-nav-label">{translate('admin')}</span>
          </button>
        </div>
      </nav>

      {/* ═══ 4. NATIONAL OPD ANNOUNCEMENTS MARQUEE TICKER (Rule G) ═══ */}
      <AnnouncementTicker />

      {/* Global Staff / Doctor Login Modal */}
      {loginModalOpen && (
        <OrsLoginCard
          isModal={true}
          onClose={() => setLoginModalOpen(false)}
          title={translate('Doctor / Staff Sign-In')}
          subtitle={translate('Clinical & Administrative Access · अस्पताल कर्मी लॉगिन')}
          role={activeView === 'doctor' ? 'doctor' : activeView === 'admin' ? 'admin' : 'doctor'}
          defaultTab="staff"
          onSuccess={() => setLoginModalOpen(false)}
          onProceed={() => {
            setLoginModalOpen(false);
            if (activeView === 'doctor') onViewChange('doctor');
            else if (activeView === 'admin') onViewChange('admin');
            else if (activeView === 'kiosk') onViewChange('kiosk');
            else onViewChange('phone');
          }}
        />
      )}
    </header>
  );
}
