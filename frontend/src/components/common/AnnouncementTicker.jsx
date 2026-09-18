import React, { useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AnnouncementTicker — National OPD Announcements Marquee Ticker
 * Compliant with Rule G: High-contrast single-language notice tags [जरूरी] / [IMPORTANT].
 * Zero emojis, includes accessible pause/resume control.
 */
export default function AnnouncementTicker() {
  const { translate } = useLanguage();
  const [marqueePaused, setMarqueePaused] = useState(false);

  const announcements = [
    {
      tag: 'IMPORTANT',
      type: 'urgent',
      key: 'ticker_1',
      defaultEn: 'OPD Smart Intake Terminal #01 operational for district civil hospital.'
    },
    {
      tag: 'NEW',
      type: 'new',
      key: 'ticker_2',
      defaultEn: 'ABHA & Ayushman Bharat digital health registration enabled.'
    },
    {
      tag: 'NOTICE',
      type: 'notice',
      key: 'ticker_3',
      defaultEn: 'Bhashini AI voice assistant active in 12 Indian regional languages.'
    },
    {
      tag: 'SECURE',
      type: 'secure',
      key: 'ticker_4',
      defaultEn: '256-Bit SSL Encrypted & National Health Data Management compliant.'
    }
  ];

  return (
    <div className="gov-marquee-ticker" role="region" aria-label="Official Announcements Ticker">
      <div className="gov-marquee-badge">
        <Volume2 size={13} className="gov-marquee-icon" aria-hidden="true" />
        <span>{translate('Latest Announcements')}</span>
      </div>

      <div 
        className={`gov-marquee-track-wrap ${marqueePaused ? 'paused' : ''}`}
        onMouseEnter={() => setMarqueePaused(true)}
        onMouseLeave={() => setMarqueePaused(false)}
      >
        <div className="gov-marquee-content">
          {announcements.map((item, idx) => (
            <span key={idx} className="gov-ticker-item">
              <span className={`gov-ticker-tag ${item.type}`}>
                [{translate(item.tag)}]
              </span>
              <span className="gov-ticker-text">
                {translate(item.key, item.defaultEn)}
              </span>
              <span className="gov-ticker-sep" aria-hidden="true">•</span>
            </span>
          ))}
        </div>
        <div className="gov-marquee-content" aria-hidden="true">
          {announcements.map((item, idx) => (
            <span key={idx} className="gov-ticker-item">
              <span className={`gov-ticker-tag ${item.type}`}>
                [{translate(item.tag)}]
              </span>
              <span className="gov-ticker-text">
                {translate(item.key, item.defaultEn)}
              </span>
              <span className="gov-ticker-sep">•</span>
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="gov-marquee-pause-btn"
        onClick={() => setMarqueePaused(!marqueePaused)}
        title={marqueePaused ? "Play Marquee" : "Pause Marquee"}
        aria-label={marqueePaused ? "Resume news ticker" : "Pause news ticker"}
      >
        {marqueePaused ? <Play size={11} aria-hidden="true" /> : <Pause size={11} aria-hidden="true" />}
      </button>
    </div>
  );
}
