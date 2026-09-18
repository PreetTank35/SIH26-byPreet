import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * LanguageDropdown — Compact Government Language Selector
 * Displays Globe icon + "भाषा / Language" + Chevron
 * Expands to an accessible radio-list of 22 Bhashini 8th-Schedule Constitutional Languages.
 */
export default function LanguageDropdown() {
  const { language, setLanguage, bhashiniLanguages = [] } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="gov-lang-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="gov-lang-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select portal language / भाषा चुनें"
        title="Choose language / भाषा चुनें"
      >
        <Globe size={13} className="gov-lang-globe-icon" aria-hidden="true" />
        <span className="gov-lang-btn-text">भाषा / Language</span>
        <ChevronDown size={12} className={`gov-lang-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="gov-lang-dropdown-panel" role="listbox" aria-label="Official Languages of India">
          <div className="gov-lang-dropdown-header">
            <span>{language === 'hi' ? 'भाषा चुनें' : 'Select Language'}</span>
          </div>
          <div className="gov-lang-list">
            {bhashiniLanguages.map((langItem) => {
              const isSelected = language === langItem.code;
              const isReady = langItem.ready !== false;
              const comingSoonText = language === 'hi' ? 'शीघ्र उपलब्ध' : 'Coming Soon';

              return (
                <button
                  key={langItem.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!isReady}
                  disabled={!isReady}
                  className={`gov-lang-option ${isSelected ? 'selected' : ''} ${!isReady ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!isReady) return;
                    setLanguage(langItem.code);
                    setIsOpen(false);
                  }}
                  title={!isReady ? `${langItem.name} — ${comingSoonText}` : `${langItem.name}`}
                  style={!isReady ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: 'transparent' } : {}}
                >
                  <span className="gov-lang-radio-dot" aria-hidden="true">
                    {isSelected && <span className="gov-lang-radio-inner" />}
                  </span>
                  <span className="gov-lang-native-name">{langItem.nativeName}</span>
                  <span className="gov-lang-en-name">({langItem.name})</span>
                  {!isReady ? (
                    <span 
                      style={{ 
                        marginLeft: 'auto', 
                        fontSize: '9.5px', 
                        padding: '1px 5px', 
                        backgroundColor: '#F3F4F6', 
                        color: '#6B7280', 
                        borderRadius: '2px', 
                        border: '1px solid #D1D5DB',
                        fontWeight: 600
                      }}
                    >
                      {comingSoonText}
                    </span>
                  ) : (
                    isSelected && <Check size={13} className="gov-lang-check-icon" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="gov-lang-dropdown-footer">
            <span>भाषिणी · Powered by Bhashini (MeitY)</span>
          </div>
        </div>
      )}
    </div>
  );
}
