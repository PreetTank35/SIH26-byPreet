import React, { forwardRef } from 'react';

/**
 * ScrollableContentArea — Standardized Government Viewport Scroll Container
 * Implements Rule [K] Viewport-Fit & Scrollability:
 * - Sits between <FixedHeader /> + <FixedBreadcrumb /> (top) and <FixedFooter /> (bottom)
 * - The ONLY container allowed to scroll on the page
 * - Never lets content silently clip or hide
 * - Hosts sticky bottom CTA dock ensuring one-tap access on touch screens
 */
const ScrollableContentArea = forwardRef(function ScrollableContentArea({
  children,
  className = '',
  id = 'gov-scrollable-content',
  style = {},
  maxWidth = '1140px',
  ...props
}, ref) {
  return (
    <div
      ref={ref}
      id={id}
      className={`gov-scrollable-content ${className}`}
      style={{
        flex: '1 0 auto',
        width: '100%',
        minHeight: '100%',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'visible',
        WebkitOverflowScrolling: 'touch',
        ...style
      }}
      {...props}
    >
      <div 
        className="gov-scrollable-inner"
        style={{
          width: '100%',
          maxWidth: maxWidth,
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          paddingBottom: 'clamp(40px, 6vh, 80px)'
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default ScrollableContentArea;
