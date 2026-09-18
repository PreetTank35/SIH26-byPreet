import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AnnouncementTicker — National OPD Announcements Marquee Ticker
 * Compliant with GIGW 3.0 & Rule G:
 * - High-visibility institutional notices with colored tag badges ([PRIORITY], [NEW], [AYUSH OPD], [VOICE AI], [NOTICE])
 * - Bilingual support: English and Hindi
 * - Direct GPU-accelerated requestAnimationFrame motion (100% immune to OS reduced-motion freezes)
 * - Seamless zero-delay loop with hover pause and accessible play/pause control
 */
export default function AnnouncementTicker() {
  const { language, translate } = useLanguage();
  const [marqueePaused, setMarqueePaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef(null);
  const group1Ref = useRef(null);
  const offsetRef = useRef(0);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  const isHindi = language === 'hi';

  const announcements = [
    {
      tag: isHindi ? 'प्राथमिकता' : 'PRIORITY',
      type: 'urgent',
      text: isHindi 
        ? 'वरिष्ठ नागरिकों, गर्भवती महिलाओं एवं आपातकालीन मरीजों के लिए तत्काल प्राथमिकता टोकन उपलब्ध है।' 
        : 'Priority OPD tokens active for Senior Citizens, Expectant Mothers & Emergency cases.'
    },
    {
      tag: isHindi ? 'नई सुविधा' : 'NEW FEATURE',
      type: 'new',
      text: isHindi 
        ? 'स्मार्टफोन से QR स्कैन करें या 14 अंकों का आभा (ABHA) नंबर दर्ज कर एक्सप्रेस चेक-इन करें।' 
        : 'Scan QR with smartphone or enter 14-digit ABHA ID for instant express check-in.'
    },
    {
      tag: isHindi ? 'आयुष ओपीडी' : 'AYUSH OPD',
      type: 'ayush',
      text: isHindi 
        ? 'कमरा नं. 102 व 201 में आयुर्वेद, होम्योपैथी एवं पंचकर्म विशेषज्ञ परामर्श चालू है।' 
        : 'Ayurveda, Homeopathy & Panchakarma clinical consultations active in Rooms 102 & 201.'
    },
    {
      tag: isHindi ? 'आवाज से जांच' : 'VOICE AI',
      type: 'voice',
      text: isHindi 
        ? 'भाषिणी AI वॉइस सहायक सक्रिय — माइक दबाकर अपने लक्षण हिंदी, अंग्रेजी या क्षेत्रीय भाषा में बताएं।' 
        : 'Bhashini Voice AI active — tap mic to speak your symptoms in Hindi, English, or regional languages.'
    },
    {
      tag: isHindi ? 'कतार सूचना' : 'QUEUE NOTICE',
      type: 'notice',
      text: isHindi 
        ? 'पेपरलेस डिजिटल टोकन प्रणाली लागू — आपका नंबर ओपीडी डिस्प्ले स्क्रीन पर पुकारा जाएगा।' 
        : 'Paperless queue active — your token number will be called on overhead OPD display screens.'
    }
  ];

  useEffect(() => {
    lastTimeRef.current = performance.now();
    const speed = 60; // 60 pixels per second (clear, smooth marquee movement)

    const tick = (now) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (!marqueePaused && !isHovered && trackRef.current && group1Ref.current) {
        const groupWidth = group1Ref.current.offsetWidth;
        if (groupWidth > 0) {
          offsetRef.current -= speed * delta;
          if (Math.abs(offsetRef.current) >= groupWidth) {
            offsetRef.current += groupWidth;
          }
          trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [marqueePaused, isHovered, language]);

  return (
    <div className="gov-marquee-ticker" role="region" aria-label="Official Announcements Ticker">
      <div className="gov-marquee-badge">
        <span className="gov-marquee-pulse-dot" aria-hidden="true"></span>
        <Volume2 size={13} className="gov-marquee-icon" aria-hidden="true" />
        <span>{translate('Latest Announcements')}</span>
      </div>

      <div 
        className="gov-marquee-track-wrap"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={marqueePaused ? "Marquee paused" : "Hover to pause marquee"}
      >
        <div ref={trackRef} className="gov-marquee-track">
          {/* Group 1 (Active Display) */}
          <div ref={group1Ref} className="gov-marquee-group">
            {announcements.map((item, idx) => (
              <span key={`g1-${idx}`} className="gov-ticker-item">
                <span className={`gov-ticker-tag ${item.type}`}>
                  [{item.tag}]
                </span>
                <span className="gov-ticker-text">
                  {item.text}
                </span>
                <span className="gov-ticker-sep" aria-hidden="true">•</span>
              </span>
            ))}
          </div>

          {/* Group 2 (Seamless Infinite Clone) */}
          <div className="gov-marquee-group" aria-hidden="true">
            {announcements.map((item, idx) => (
              <span key={`g2-${idx}`} className="gov-ticker-item">
                <span className={`gov-ticker-tag ${item.type}`}>
                  [{item.tag}]
                </span>
                <span className="gov-ticker-text">
                  {item.text}
                </span>
                <span className="gov-ticker-sep" aria-hidden="true">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="gov-marquee-pause-btn"
        onClick={() => setMarqueePaused(!marqueePaused)}
        title={marqueePaused ? (isHindi ? "समाचार शुरू करें" : "Resume Announcements") : (isHindi ? "समाचार रोकें" : "Pause Announcements")}
        aria-label={marqueePaused ? "Resume news ticker" : "Pause news ticker"}
      >
        {marqueePaused ? <Play size={11} aria-hidden="true" /> : <Pause size={11} aria-hidden="true" />}
      </button>
    </div>
  );
}

