import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * SmartScrollAssistant — Government Intelligent Scroll Support Pill & Back-to-Top
 * Automatically senses whether content exceeds the visible viewport fold:
 * 1. Shows "Scroll to view more ↓" / "नीचे और देखें ↓" when more content exists below.
 * 2. Provides 1-tap "↑ Top" return button when scrolled down on long forms.
 * 1. Shows "Scroll to view more ↓" / "नीचे और देखें ↓" when more content exists below.
 * 2. Provides 1-tap "↑ Top" return button when scrolled down on long forms.
 * 3. Works reliably across all screen sizes and never locks out content.
 */
export default function SmartScrollAssistant() {
  const { language } = useLanguage();
  const [hasOverflowBelow, setHasOverflowBelow] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let ticking = false;

    const checkScrollState = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const mainContent = document.getElementById('main-content');
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        mainContent ? mainContent.scrollHeight : 0
      );

      // Show back to top button after scrolling down 240px
      setShowBackToTop(scrollY > 240);

      // Show "Scroll to view more" if content extends at least 35px beyond the fold and user hasn't scrolled to bottom
      const remainingDistance = totalHeight - (scrollY + viewportHeight);
      const isScrollable = totalHeight > viewportHeight + 35;
      setHasOverflowBelow(isScrollable && remainingDistance > 45);

      ticking = false;
    };

    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScrollState();
        });
        ticking = true;
      }
    };

    // Initial check
    checkScrollState();
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    // Mutation observer for dynamic elements expanding (e.g. drawers, options, forms)
    let observer;
    const mainEl = document.getElementById('main-content') || document.body;
    if (typeof MutationObserver !== 'undefined' && mainEl) {
      observer = new MutationObserver(() => {
        handleScrollOrResize();
      });
      observer.observe(mainEl, { childList: true, subtree: true, attributes: false });
    }

    const interval = setInterval(checkScrollState, 700);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (observer) observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleScrollDown = () => {
    const scrollStep = Math.round(window.innerHeight * 0.65) || 360;
    window.scrollBy({ top: scrollStep, behavior: 'smooth' });
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!hasOverflowBelow && !showBackToTop) return null;

  return (
    <aside 
      className="gov-smart-scroll-assistant" 
      aria-label="Smart Scroll Navigation"
      style={{
        position: 'fixed',
        bottom: 'clamp(36px, 5vh, 56px)',
        right: 'clamp(14px, 2.5vw, 28px)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none'
      }}
    >
      {/* 1. "Scroll to view more" Gentle Floating Pill */}
      {hasOverflowBelow && (
        <button
          type="button"
          onClick={handleScrollDown}
          className="gov-scroll-cue-pill"
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#0B1F3A',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '12.5px',
            fontWeight: 700,
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 6px 18px rgba(11, 31, 58, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            animation: 'govBounceSubtle 2.2s infinite ease-in-out'
          }}
          title={language === 'hi' ? 'नीचे अधिक विकल्प देखें' : 'Scroll to view more options'}
        >
          <span>{language === 'hi' ? 'नीचे और देखें' : 'Scroll for more'}</span>
          <ArrowDown size={14} />
        </button>
      )}

      {/* 2. "Back to Top" Fast Jump Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={handleScrollTop}
          className="gov-back-to-top-btn"
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#FFFFFF',
            color: 'var(--gov-primary, #0B1F3A)',
            padding: '7px 13px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            border: '1.5px solid var(--gov-border-strong, #94A3B8)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={language === 'hi' ? 'वापस ऊपर जाएं' : 'Return to top'}
        >
          <ArrowUp size={13} />
          <span>{language === 'hi' ? 'ऊपर' : 'Top'}</span>
        </button>
      )}
    </aside>
  );
}
