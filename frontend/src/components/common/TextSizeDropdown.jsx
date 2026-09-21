import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * TextSizeDropdown — Accessibility Text Size Resizer Dropdown
 * Standard government portal accessibility feature providing:
 * - Small (A-) [85%]
 * - Normal (A) [100% Default]
 * - Large (A+) [115%]
 * - Extra Large (A++) [130%]
 * Dynamically scales root font size, updates CSS custom properties,
 * and persists the preference in localStorage.
 */
export default function TextSizeDropdown() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const FONT_PRESETS = [
    { scale: 85, key: 'small', labelEn: 'Small (A-)', labelHi: 'छोटा (A-)', badge: 'A-', percent: '85%' },
    { scale: 100, key: 'normal', labelEn: 'Normal (A)', labelHi: 'सामान्य (A)', badge: 'A', percent: '100%' },
    { scale: 115, key: 'large', labelEn: 'Large (A+)', labelHi: 'बड़ा (A+)', badge: 'A+', percent: '115%' },
    { scale: 130, key: 'xlarge', labelEn: 'Extra Large (A++)', labelHi: 'अति बड़ा (A++)', badge: 'A++', percent: '130%' }
  ];

  const [fontScale, setFontScale] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('medikiosk_font_scale') || localStorage.getItem('preferred_text_size');
      if (saved) {
        const num = Number(saved);
        if ([85, 100, 115, 130].includes(num)) return num;
      }
    }
    return 100;
  });

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

  const applyFontScaleToDocument = (scale) => {
    if (typeof document === 'undefined') return;
    const ratio = scale / 100;
    // Scale root font size proportionally (base 16px)
    document.documentElement.style.fontSize = `${ratio * 16}px`;
    document.documentElement.style.setProperty('--font-scale', `${ratio}`);
    document.documentElement.setAttribute('data-font-scale', scale.toString());
    
    // Manage scale classes on root html element
    document.documentElement.classList.remove('font-scale-85', 'font-scale-100', 'font-scale-115', 'font-scale-130', 'font-scale-150');
    document.documentElement.classList.add(`font-scale-${scale}`);
  };

  const handleSelectFontScale = (scale) => {
    setFontScale(scale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('medikiosk_font_scale', scale.toString());
      localStorage.setItem('preferred_text_size', scale.toString());
    }
    applyFontScaleToDocument(scale);
  };

  // Sync on mount and state update
  useEffect(() => {
    applyFontScaleToDocument(fontScale);
  }, [fontScale]);

  const currentPreset = FONT_PRESETS.find(p => p.scale === fontScale) || FONT_PRESETS[1];

  return (
    <div className="gov-font-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="gov-font-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Text Size / अक्षर आकार: Select website font size"
        title="Text Size / अक्षर आकार"
      >
        <span className="gov-font-icon-badge" aria-hidden="true">A</span>
        <span className="gov-font-btn-text">
          {language === 'hi' ? 'आकार' : 'Text Size'}
        </span>
        <ChevronDown size={12} className={`gov-lang-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="gov-font-dropdown-panel" role="listbox" aria-label="Official Text Size Presets">
          <div className="gov-lang-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{language === 'hi' ? 'अक्षर का आकार' : 'Text Size'}</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{currentPreset.badge} ({currentPreset.percent})</span>
          </div>
          <div className="gov-lang-list">
            {FONT_PRESETS.map((preset) => {
              const isSelected = fontScale === preset.scale;
              return (
                <button
                  key={preset.scale}
                  type="button"
                  className={`gov-lang-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectFontScale(preset.scale);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div className="gov-lang-item-content">
                    <span className="gov-lang-native" style={{ fontWeight: isSelected ? '700' : '500' }}>
                      {language === 'hi' ? preset.labelHi : preset.labelEn}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: isSelected ? 'var(--gov-primary)' : 'var(--gov-text-muted)', fontWeight: '600' }}>
                      {preset.percent}
                    </span>
                    {isSelected && <Check size={14} className="gov-lang-check" aria-hidden="true" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
