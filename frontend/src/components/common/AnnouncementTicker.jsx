import React, { useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AnnouncementTicker — National OPD Announcements Marquee Ticker
 * Compliant with GIGW 3.0 & Rule G:
 * - High-visibility institutional notices with colored tag badges ([PRIORITY], [NEW], [AYUSH OPD], [VOICE AI], [NOTICE])
 * - Bilingual support: English and Hindi
 * - Seamless zero-delay marquee loop (immediately visible on load)
 * - Pause on hover & interactive accessible play/pause control
 */
export default function AnnouncementTicker() {
  const { language, translate } = useLanguage();
  const [marqueePaused, setMarqueePaused] = useState(false);

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

  return (
    <div className="gov-marquee-ticker" role="region" aria-label="Official Announcements Ticker">
      <div className="gov-marquee-badge">
        <span className="gov-marquee-pulse-dot" aria-hidden="true"></span>
        <Volume2 size={13} className="gov-marquee-icon" aria-hidden="true" />
        <span>{translate('Latest Announcements')}</span>
      </div>

      <div 
        className={`gov-marquee-track-wrap ${marqueePaused ? 'paused' : ''}`}
        onMouseEnter={() => setMarqueePaused(true)}
        onMouseLeave={() => setMarqueePaused(false)}
      >
        {/* Track 1 */}
        <div className="gov-marquee-track">
          {announcements.map((item, idx) => (
            <span key={`track1-${idx}`} className="gov-ticker-item">
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

        {/* Track 2 (Follows seamlessly behind Track 1) */}
        <div className="gov-marquee-track" aria-hidden="true">
          {announcements.map((item, idx) => (
            <span key={`track2-${idx}`} className="gov-ticker-item">
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

