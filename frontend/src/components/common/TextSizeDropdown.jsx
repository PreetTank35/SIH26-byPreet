import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * TextSizeDropdown — Accessible Font Size Presets Dropdown
 * Displays "A" badge + "आकार / Text Size" + Chevron
 * Expands to a radio-list of discrete WCAG preset levels: 100%, 115%, 130%, 150%.
 */
export default function TextSizeDropdown() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [fontScale, setFontScale] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('medikiosk_font_scale');
      if (saved) return Number(saved);
    }
    return 100;
  });

  const FONT_PRESETS = [
    { scale: 100, labelEn: '100% (Standard)', labelHi: '100% (सामान्य)' },
    { scale: 115, labelEn: '115% (Medium)', labelHi: '115% (मध्यम)' },
    { scale: 130, labelEn: '130% (Large)', labelHi: '130% (बड़ा)' },
    { scale: 150, labelEn: '150% (Extra Large)', labelHi: '150% (अति बड़ा)' }
  ];

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

  const handleSelectFontScale = (scale) => {
    setFontScale(scale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('medikiosk_font_scale', scale);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = `${(scale / 100) * 16}px`;
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = `${(fontScale / 100) * 16}px`;
    }
  }, [fontScale]);

  return (
    <div className="gov-font-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="gov-font-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select text size / अक्षर का आकार चुनें"
        title="Choose text size / अक्षर का आकार चुनें"
      >
        <span className="gov-font-icon-badge" aria-hidden="true">A</span>
        <span className="gov-font-btn-text">
          {language === 'hi' ? 'आकार' : 'Text Size'}
        </span>
        <ChevronDown size={12} className={`gov-lang-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="gov-font-dropdown-panel" role="listbox" aria-label="Official Text Size Presets">
          <div className="gov-lang-dropdown-header">
            <span>{language === 'hi' ? 'अक्षर का आकार' : 'Select Text Size'}</span>
          </div>
          <div className="gov-lang-list">
            {FONT_PRESETS.map((preset) => {
              const isSelected = fontScale === preset.scale;
              return (
                <button
                  key={preset.scale}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`gov-lang-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectFontScale(preset.scale);
                    setIsOpen(false);
                  }}
                >
                  <span className="gov-lang-radio-dot" aria-hidden="true">
                    {isSelected && <span className="gov-lang-radio-inner" />}
                  </span>
                  <span className="gov-lang-native-name">
                    {language === 'hi' ? preset.labelHi : preset.labelEn}
                  </span>
                  {isSelected && <Check size={13} className="gov-lang-check-icon" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="gov-lang-dropdown-footer">
            <span>WCAG 2.2 AA · Text Resizing</span>
          </div>
        </div>
      )}
    </div>
  );
}
