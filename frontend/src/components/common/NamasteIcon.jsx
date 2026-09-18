import React from 'react';

/**
 * Official Respectful Greeting (Namaste / Pranam) SVG Icon
 * Replaces informal unicode emoji (🙏) with a dignified institutional vector icon.
 */
export default function NamasteIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`gov-namaste-icon ${className}`}
      aria-label="Namaste greeting icon"
      role="img"
      style={{ verticalAlign: 'middle', display: 'inline-block' }}
    >
      {/* Left Palm outline */}
      <path d="M12 3v13" strokeDasharray="1 1" opacity="0.3" />
      <path d="M10.2 5.2C9.4 6.8 8.5 8.9 8.2 10.8c-.3 1.9.3 3.6 1.4 4.8 1.1 1.2 2.4 2.4 2.4 4.4v1" />
      {/* Right Palm outline */}
      <path d="M13.8 5.2c.8 1.6 1.7 3.7 2 5.6.3 1.9-.3 3.6-1.4 4.8-1.1 1.2-2.4 2.4-2.4 4.4v1" />
      {/* Joined Fingertips Arch */}
      <path d="M10.2 5.2c.6-1.2 1.2-2.2 1.8-2.2s1.2 1 1.8 2.2" />
      {/* Base Cuffs / Wrist Lines */}
      <path d="M8 21h8" />
      <path d="M9.5 18.5h5" opacity="0.6" />
      {/* Inner Heart/Respect Accent */}
      <circle cx="12" cy="11.5" r="1.5" fill={color} stroke="none" opacity="0.85" />
    </svg>
  );
}
