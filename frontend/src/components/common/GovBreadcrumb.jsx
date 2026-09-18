import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * GovBreadcrumb — Official Government Breadcrumb Navigation Strip
 * Strictly adheres to Rule B & Rule C:
 * - Rendered in current selected language ONLY (single-language string).
 * - Never concatenate English + Hindi.
 */
export default function GovBreadcrumb({ items = [], onNavigate }) {
  const { language, translate } = useLanguage();

  const defaultItems = [
    { labelEn: 'Home', labelHi: 'होम', path: 'kiosk' },
    { labelEn: 'Kiosk Terminal', labelHi: 'कियोस्क टर्मिनल', path: 'kiosk' },
    { labelEn: 'Patient Intake', labelHi: 'मरीज पंजीकरण', active: true }
  ];

  const trail = items.length > 0 ? items : defaultItems;

  return (
    <nav className="gov-breadcrumb-strip" aria-label="Breadcrumb Navigation">
      <div className="gov-breadcrumb-container">
        <ol className="gov-breadcrumb-list">
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1 || item.active;
            
            // Derive single active language label
            const labelText = translate(item.labelEn || item.label) || (language === 'hi' ? item.labelHi : item.labelEn) || item.label || '';

            return (
              <li key={index} className={`gov-breadcrumb-item ${isLast ? 'current' : ''}`}>
                {index === 0 && <Home size={13} className="gov-breadcrumb-home-icon" aria-hidden="true" />}
                {isLast ? (
                  <span className="gov-breadcrumb-current" aria-current="page">
                    {labelText}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="gov-breadcrumb-link"
                    onClick={() => onNavigate && onNavigate(item.path)}
                  >
                    {labelText}
                  </button>
                )}
                {!isLast && (
                  <ChevronRight size={12} className="gov-breadcrumb-sep" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
