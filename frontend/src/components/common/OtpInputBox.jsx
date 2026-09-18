import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function OtpInputBox({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true
}) {
  const { translate } = useLanguage();
  const inputRefs = useRef([]);

  // Ensure digits array matches length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    // Extract only digits
    const cleaned = rawVal.replace(/\D/g, '');

    if (!cleaned) {
      // Clear current digit
      const nextDigits = [...digits];
      nextDigits[index] = '';
      onChange(nextDigits.join(''));
      return;
    }

    if (cleaned.length > 1) {
      // User typed or pasted multiple digits directly into one input
      handlePasteDirect(cleaned);
      return;
    }

    // Single digit entered
    const single = cleaned.charAt(cleaned.length - 1);
    const nextDigits = [...digits];
    nextDigits[index] = single;
    const newOtp = nextDigits.join('');
    onChange(newOtp);

    // Auto-advance to next box if available
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Current is already empty, jump to previous and clear it
        inputRefs.current[index - 1].focus();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        onChange(nextDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasteData) return;
    handlePasteDirect(pasteData);
  };

  const handlePasteDirect = (str) => {
    const validStr = str.replace(/\D/g, '').slice(0, length);
    onChange(validStr);
    const focusIndex = Math.min(validStr.length, length - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  return (
    <div className="gov-otp-boxes-wrapper" onPaste={handlePaste} role="group" aria-label="6-Digit OTP verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`gov-otp-single-box ${digit ? 'filled' : ''}`}
          aria-label={`Digit ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  );
}
