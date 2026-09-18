import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * GovStepIndicator — Formal Government Form Step Progress Bar
 * Compliant with Rule D:
 * - Formal label: "Form OPD-01 · Step 1 of 4: [Title]" / "फॉर्म OPD-01 · चरण 1 / 4: [Title]"
 * - Rendered in current selected language ONLY (never concatenated).
 * - Visual dots / progress blocks large, bold, high-contrast.
 */
export default function GovStepIndicator({
  formCode = 'OPD-01',
  currentStep = 1,
  totalSteps = 4,
  titleEn = 'Patient Identity Verification',
  titleHi = 'मरीज पहचान सत्यापन',
  steps = [
    { number: 1, labelEn: 'Identity', labelHi: 'पहचान' },
    { number: 2, labelEn: 'Consent', labelHi: 'सहमति' },
    { number: 3, labelEn: 'Symptoms', labelHi: 'लक्षण जांच' },
    { number: 4, labelEn: 'OPD Token', labelHi: 'टोकन' }
  ]
}) {
  const { language, translate } = useLanguage();
  const isHi = language === 'hi';

  const currentTitle = translate(titleEn) || (isHi ? titleHi : titleEn);
  const formPrefix = isHi ? 'फॉर्म' : 'Form';
  const stepPrefix = translate('Step') || (isHi ? 'चरण' : 'Step');
  const ofSeparator = translate('of') || (isHi ? '/' : 'of');
  const counterText = `${formPrefix} ${formCode} · ${stepPrefix} ${currentStep} ${ofSeparator} ${totalSteps}: ${currentTitle}`;

  return (
    <div className="gov-step-indicator-wrapper" role="region" aria-label={counterText}>
      <div className="gov-step-header">
        <div className="gov-step-counter-text">
          {counterText}
        </div>
      </div>

      {/* Visual Progress Blocks / Large Dots */}
      <div className="gov-step-progress-track">
        {steps.map((s, idx) => {
          const stepNum = s.number || idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const label = translate(s.labelEn) || (isHi ? s.labelHi : s.labelEn);

          return (
            <div
              key={idx}
              className={`gov-step-block ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="gov-step-block-indicator" aria-hidden="true">
                {isCompleted ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <div className="gov-step-block-label">
                <span className="gov-step-label-text">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
