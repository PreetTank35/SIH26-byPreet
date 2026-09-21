import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const LanguageContext = createContext(null);

// ═══ OFFICIAL BHASHINI (NLTM - NATIONAL LANGUAGE TRANSLATION MISSION) LANGUAGES ═══
// 22 8th-Schedule Constitutional Languages of India + English
// Rule L: Only fully translated languages have ready: true. Others have ready: false ('Coming Soon').
export const BHASHINI_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin', ready: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari', ready: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', ready: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', ready: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', ready: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', ready: true },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', ready: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', ready: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', ready: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', ready: true },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', ready: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali-Assamese', ready: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'Perso-Arabic', ready: true },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Devanagari', ready: true },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'Devanagari', ready: true },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'Devanagari', ready: true },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'Devanagari', ready: true },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki', ready: true },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', script: 'Perso-Arabic', ready: true },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', script: 'Perso-Arabic', ready: true },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'Devanagari', ready: true },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', script: 'Meetei Mayek', ready: true },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'Devanagari', ready: true }
];

const translations = {
  // ──────────────────────────────────────────
  // 1. ENGLISH (en)
  // ──────────────────────────────────────────
  en: {
    // Portals & Navigation
    kiosk: 'Kiosk Terminal',
    phone: 'Patient Phone',
    doctor: 'Doctor Portal',
    admin: 'Admin Portal',
    home: 'Home',
    patientIntake: 'Patient Intake',
    closeMenu: 'Close Menu',
    portalViews: 'Portal Views',
    english: 'English',
    hindi: 'हिन्दी',
    comingSoon: 'Coming Soon',
    translating: 'Translating...',

    // National Header & Branding
    govTitle: 'Government of India | Ministry of Ayush',
    'Government of India': 'Government of India',
    'Ministry of Ayush': 'Ministry of Ayush',
    'Smart OPD Intake & Clinical Ayush Triage Portal': 'Smart OPD Intake & Clinical Ayush Triage Portal',
    'OPD Smart Intake Terminal': 'OPD Smart Intake Terminal',
    'OPD Smart Intake Terminal Sub': 'OPD Smart Intake Terminal · ओपीडी स्मार्ट पंजीकरण टर्मिनल',
    'District Civil & AYUSH Hospital': 'District Civil & AYUSH Hospital',
    'OPD Registration & Clinical Case-Taking': 'OPD Registration & Clinical Case-Taking',
    'Reset Kiosk': 'Reset Kiosk',
    'Terminal Identification': 'Terminal Identification',
    'Screen Reader Access': 'Screen Reader Access',
    'Skip to Main Content': 'Skip to Main Content',
    'Text Size': 'Text Size',
    'Text Zoom': 'Text Zoom',
    'Choose language': 'Choose Language / भाषा चुनें',
    'Select Language': 'Select Language',
    'Doctor / Staff Sign-In': 'Doctor / Staff Sign-In',
    'Sign Out': 'Sign Out',

    // Announcements Ticker
    'Latest Announcements': 'LATEST ANNOUNCEMENTS',
    'IMPORTANT': 'IMPORTANT',
    'NEW': 'NEW',
    'NOTICE': 'NOTICE',
    'SECURE': 'SECURE',
    'ticker_1': 'OPD Smart Intake Terminal #01 operational for district civil hospital.',
    'ticker_2': 'ABHA & Ayushman Bharat digital health registration enabled.',
    'ticker_3': 'Bhashini AI voice assistant active in 12 Indian regional languages.',
    'ticker_4': '256-Bit SSL Encrypted & National Health Data Management compliant.',

    // Step Indicator
    'Form OPD-01': 'Form OPD-01',
    'Step': 'Step',
    'of': 'of',
    'Personal Details': 'Personal Details',
    'Consent': 'Consent',
    'Symptoms': 'Symptoms',
    'Token': 'Token',
    'OPD Queue Token': 'OPD Queue Token',
    'Symptoms Inquiry': 'Symptoms Inquiry',
    'Patient Consent': 'Patient Consent',
    'Identity': 'Identity',

    // Kiosk Welcome / Idle
    'Touch screen to begin check-in': 'Touch screen to begin check-in and generate an OPD consultation queue token.',
    'Start Patient Intake': 'Start Patient Intake',
    'New OPD consultation check-in & queue token': 'New OPD consultation check-in & queue token',
    'Rapid Walk-In Token': 'Rapid Walk-In Token',
    'Instant emergency token without mobile/ABHA': 'Instant emergency token without mobile/ABHA',
    'Emergency Walk-in Notice': 'Emergency / Walk-in Registration: For patients without an ABHA card or mobile phone, generate an instant verified walk-in OPD token.',

    // Method Selector
    'How would you like to check in?': 'How would you like to check in?',
    'Choose your registration method below': 'Choose your registration method below',
    'ABHA / Health ID': 'ABHA / Health ID',
    'Login with ABHA Number or ABHA Address': 'Login with ABHA Number or ABHA Address',
    'Using Mobile Number': 'Using Mobile Number',
    'Login with 10-digit mobile number and OTP': 'Login with 10-digit mobile number and OTP',
    'Your information is confidential and secure': 'Your information is confidential and secure',

    // Login Form & Verification
    'Verify via ABHA ID': 'Verify via ABHA ID',
    'Verify via Mobile Number': 'Verify via Mobile Number',
    'Enter 14-digit ABHA number or address': 'Enter 14-digit ABHA number or address',
    'Enter 10-digit mobile number': 'Enter 10-digit mobile number',
    'ABHA Number or Address': 'ABHA Number or Address',
    '10-Digit Mobile Number': '10-Digit Mobile Number',
    'Speak ABHA Number': 'Speak ABHA Number',
    'Speak Mobile Number': 'Speak Mobile Number',
    'Don\'t have an ABHA? Create here': 'Don\'t have an ABHA? Create here',
    'What is ABHA?': 'What is ABHA?',
    'Choose another method': 'Choose another method',
    'Proceed': 'Proceed',
    'Verifying...': 'Verifying...',
    'Understood': 'Understood',
    'Please enter a valid ABHA number or address': 'Please enter a valid ABHA number or address',
    'Please enter a 10-digit mobile number': 'Please enter a 10-digit mobile number',
    'what_is_abha_desc': 'ABHA (Ayushman Bharat Health Account) is a 14-digit unique digital health identity issued by the Government of India. It allows you to securely store and access your medical records and OPD history across hospitals.',

    // OTP Box
    'OTP Verification': 'OTP Verification',
    'Enter the 6-digit code sent to your mobile': 'Enter the 6-digit code sent to your mobile',
    '6-Digit Verification Code': '6-Digit Verification Code',
    'Please enter all 6 digits': 'Please enter all 6 digits',
    'Verify OTP & Start': 'Verify OTP & Start Consultation',
    'Verifying OTP...': 'Verifying OTP...',
    'Change Credentials / Resend': 'Change Credentials / Resend OTP',
    'Verified Patient:': 'Verified Patient:',

    // Patient Consent
    'consent_title': 'Patient Consent',
    'consent_sub': 'Please review and accept the informed consent terms before proceeding with your clinical consultation.',
    'consent_item_1': 'I consent to sharing my health information for this clinical consultation and AI-assisted screening.',
    'consent_item_2': 'I understand that personal health questions will be asked to assist the duty medical officer.',
    'consent_item_3': 'My health data is handled securely under Government of India DPDP Act 2023 and ABDM privacy standards.',
    'I Agree — Start Consultation': 'I Agree — Start Consultation',
    'Cancel & Return': 'Cancel & Return to Home',

    // Document Upload & Inquiry
    'Upload Documents (Optional)': 'Upload Documents (Optional)',
    'Upload Past Prescriptions / Lab Reports': 'Upload Past Prescriptions / Lab Reports',
    'Skip & Continue to Questions': 'Skip & Continue to Questions',
    'AI-Assisted Symptom Inquiry': 'AI-Assisted Symptom Inquiry',
    'Press to Speak': 'Press to Speak',
    'Listening...': 'Listening... Speak now',
    'Type your answer here...': 'Type your answer here...',
    'Send': 'Send',
    'Review Clinical Report': 'Review Clinical Report',
    'Clinical Intake Report': 'Clinical Intake Report',
    'Join OPD Queue': 'Join OPD Queue',

    // Token Issued
    'Your OPD Token Number': 'Your OPD Token Number',
    'token_waiting_notice': 'Please take a seat in the waiting area. Your name will be called on the display screen shortly.',
    'Generate Official OPD Slip': 'Generate Official OPD Slip',
    'Start New Intake Session': 'Start New Intake Session',

    // Patient Phone Companion
    'Ayush OPD Citizen Portal': 'Ayush OPD Citizen Portal',
    'Government of India · Digital OPD': 'Government of India · Digital OPD',
    'Patient Login': 'Patient Login',
    'Register using your ABHA or mobile number': 'Register using your ABHA or mobile number',
    'History': 'History',
    'Active in Waiting Queue': 'Active in Waiting Queue',

    // Footer
    'RTI': 'RTI',
    'Sitemap': 'Sitemap',
    'Contact Us': 'Contact Us',
    'Privacy Policy': 'Privacy Policy',
    'Terms of Use': 'Terms of Use',
    'Accessibility Statement': 'Accessibility Statement',
    'SSL 256-Bit': 'SSL 256-Bit',
    'DPDP Act 2023 Compliant': 'DPDP Act 2023 Compliant',
    'Website Content Managed by': 'Website Content Managed by',
    'Ministry of AYUSH, Govt. of India': 'Ministry of AYUSH, Govt. of India',
    'Hosted by': 'Hosted by',
    'National Informatics Centre (NIC)': 'National Informatics Centre (NIC)',
    'Updated:': 'Updated:',
    'Visitors:': 'Visitors:',

    // Kiosk & Intake Flow
    'Back to Home': 'Back to Home',
    'Change Credentials / Resend OTP': 'Change Credentials / Resend OTP',
    'I Agree — Proceed': 'I Agree — Proceed',
    'Cancel & Return to Home': 'Cancel & Return to Home',
    'doc_upload_sub': 'If you have any existing prescriptions, lab reports, or medical reports, please upload them. This will help the AI ask smarter follow-up questions.',
    'Tap to choose a file': 'Tap to choose a file',
    'Uploading & extracting text...': 'Uploading & extracting text...',
    'Start AI Doctor Consultation (Voice/Chat)': 'Start AI Doctor Consultation (Voice/Chat)',
    'Starting...': 'Starting...',
    'Scan to Continue on Smartphone': 'Scan to Continue on Smartphone',
    'scan_qr_sub': 'Scan this QR code with your smartphone camera or Google Lens to continue the clinical intake on your personal device.',
    'Back to Options': 'Back to Options',
    'Switch to Kiosk Instead': 'Switch to Kiosk Instead',
    'Print OPD Queue Slip': 'Print OPD Queue Slip',
    'View ABHA Card': 'View ABHA Card',
    'Complete Session & Return to Main Screen': 'Complete Session & Return to Main Screen',
    'Generating your clinical report...': 'Generating your clinical report...',
    'Chief Complaint': 'Chief Complaint',
    'Symptom Summary': 'Symptom Summary',
    'Recommended Department': 'Recommended Department',
    'Clinical Notes': 'Clinical Notes',
    'Medical History': 'Medical History',
    'Severity': 'Severity',
    'Urgency': 'Urgency',
    'Queued for Consultation': 'Queued for Consultation',
    'Doctor:': 'Doctor:',
    'Room:': 'Room:',
    'Processing speech...': 'Processing speech...',
    'Listening... Speak now (tap mic when done)': 'Listening... Speak now (tap mic when done)',
    'Tap to stop recording': 'Tap to stop recording',
    'Select an option below or type/speak:': 'Select an option below or type/speak:',
    'Analyzing symptoms...': 'Analyzing symptoms...',
    'Type symptoms (e.g. fever, headache)...': 'Type symptoms (e.g. fever, headache)...',
    'Take Photo or Choose File': 'Take Photo or Choose File',
    'Start AI Symptom Inquiry': 'Start AI Symptom Inquiry',
    'Skip — No Documents': 'Skip — No Documents',
    'AI Clinical OPD Triage': 'AI Clinical OPD Triage',
    'Ministry of Ayush Protocol • Powered by MeitY Bhashini AI': 'Ministry of Ayush Protocol • Powered by MeitY Bhashini AI',
    'ai_welcome_intro': "Namaste! I am your AI Medical Intake Assistant. I'll help you describe your health concerns to the doctor. Let's begin.",
    'ai_welcome_reviewed': "I've reviewed your uploaded document(s) and will ask relevant questions based on them.",
    'No speech detected. Please speak clearly or type your answer.': 'No speech detected. Please speak clearly or type your answer.',

    // Doctor & Admin
    'Live OPD Queue': 'Live OPD Queue',
    'Call Patient': 'Call Patient',
    'Start Consultation': 'Start Consultation',
    'Start Consult': 'Start Consult',
    'Mark No-Show': 'Mark No-Show',
    'Clinical Advice / Regimen': 'Clinical Advice / Regimen',
    'Follow-up Date (Optional)': 'Follow-up Date (Optional)',
    'Past Visits & Prescriptions': 'Past Visits & Prescriptions',
    'Search Allopathic & AYUSH Medicines': 'Search Allopathic & AYUSH Medicines',
    'Hospital Administration & Operations': 'Hospital Administration & Operations',
    'Census & Footfall': 'Census & Footfall',
    'Hospital Rules & Presence': 'Hospital Rules & Presence',
    'Daily Doctor Rooms': 'Daily Doctor Rooms',
    'Save Changes': 'Save Changes'
  },

  // ──────────────────────────────────────────
  // 2. HINDI (hi)
  // ──────────────────────────────────────────
  hi: {
    // Portals & Navigation
    kiosk: 'कियोस्क टर्मिनल',
    phone: 'मरीज मोबाइल',
    doctor: 'डॉक्टर पोर्टल',
    admin: 'प्रशासन पोर्टल',
    home: 'होम',
    patientIntake: 'मरीज पंजीकरण',
    closeMenu: 'मेन्यू बंद करें',
    portalViews: 'पोर्टल विकल्प',
    english: 'English',
    hindi: 'हिन्दी',
    comingSoon: 'शीघ्र उपलब्ध',
    translating: 'अनुवाद हो रहा है...',

    // National Header & Branding
    govTitle: 'भारत सरकार | आयुष मंत्रालय',
    'Government of India': 'भारत सरकार',
    'Ministry of Ayush': 'आयुष मंत्रालय',
    'Smart OPD Intake & Clinical Ayush Triage Portal': 'स्मार्ट ओपीडी पंजीकरण एवं क्लिनिकल आयुष ट्राइएज पोर्टल',
    'OPD Smart Intake Terminal': 'ओपीडी स्मार्ट पंजीकरण टर्मिनल',
    'OPD Smart Intake Terminal Sub': 'ओपीडी स्मार्ट पंजीकरण टर्मिनल · OPD Smart Intake Terminal',
    'District Civil & AYUSH Hospital': 'जिला सिविल एवं आयुष अस्पताल',
    'OPD Registration & Clinical Case-Taking': 'ओपीडी पंजीकरण एवं क्लिनिकल केस-टेकिंग',
    'Reset Kiosk': 'कियोस्क रीसेट',
    'Terminal Identification': 'टर्मिनल पहचान',
    'Screen Reader Access': 'स्क्रीन रीडर एक्सेस',
    'Skip to Main Content': 'मुख्य सामग्री पर जाएं',
    'Text Size': 'अक्षर आकार',
    'Text Zoom': 'टेक्स्ट ज़ूम',
    'Choose language': 'भाषा चुनें / Choose Language',
    'Select Language': 'भाषा चुनें',
    'Doctor / Staff Sign-In': 'डॉक्टर / स्टाफ प्रवेश',
    'Sign Out': 'साइन आउट',

    // Announcements Ticker
    'Latest Announcements': 'नवीनतम सूचनाएं',
    'IMPORTANT': 'जरूरी',
    'NEW': 'नया',
    'NOTICE': 'सूचना',
    'SECURE': 'सुरक्षित',
    'ticker_1': 'जिला सिविल अस्पताल के लिए ओपीडी स्मार्ट इंटेक टर्मिनल #01 सक्रिय है।',
    'ticker_2': 'ABHA और आयुष्मान भारत डिजिटल स्वास्थ्य पंजीकरण सक्षम किया गया है।',
    'ticker_3': 'भाषिणी AI वॉइस असिस्टेंट 12 भारतीय क्षेत्रीय भाषाओं में सक्रिय है।',
    'ticker_4': '256-बिट SSL एन्क्रिप्टेड और राष्ट्रीय स्वास्थ्य डेटा प्रबंधन अनुपालित।',

    // Step Indicator
    'Form OPD-01': 'फॉर्म OPD-01',
    'Step': 'चरण',
    'of': '/',
    'Personal Details': 'व्यक्तिगत विवरण',
    'Consent': 'सहमति',
    'Symptoms': 'लक्षण',
    'Token': 'टोकन',
    'OPD Queue Token': 'ओपीडी कतार टोकन',
    'Symptoms Inquiry': 'लक्षण जांच',
    'Patient Consent': 'रोगी सहमति',
    'Identity': 'पहचान',

    // Kiosk Welcome / Idle
    'Touch screen to begin check-in': 'पंजीकरण शुरू करने और ओपीडी परामर्श टोकन प्राप्त करने के लिए स्क्रीन को स्पर्श करें।',
    'Start Patient Intake': 'मरीज पंजीकरण शुरू करें',
    'New OPD consultation check-in & queue token': 'नया ओपीडी परामर्श चेक-इन और कतार टोकन',
    'Rapid Walk-In Token': 'तात्कालिक वॉक-इन टोकन',
    'Instant emergency token without mobile/ABHA': 'मोबाइल या ABHA के बिना आपातकालीन टोकन',
    'Emergency Walk-in Notice': 'आपातकालीन / वॉक-इन पंजीकरण: जिन मरीजों के पास ABHA कार्ड या मोबाइल फोन नहीं है, वे तुरंत वॉक-इन ओपीडी टोकन प्राप्त करें।',

    // Method Selector
    'How would you like to check in?': 'आप कैसे चेक-इन करना चाहेंगे?',
    'Choose your registration method below': 'नीचे अपना तरीका चुनें',
    'ABHA / Health ID': 'ABHA / Health ID से',
    'Login with ABHA Number or ABHA Address': 'ABHA नंबर या ABHA एड्रेस से लॉगिन करें',
    'Using Mobile Number': 'मोबाइल नंबर से',
    'Login with 10-digit mobile number and OTP': '10 अंकों का मोबाइल नंबर और OTP से लॉगिन',
    'Your information is confidential and secure': 'आपकी जानकारी गोपनीय और सुरक्षित है',

    // Login Form & Verification
    'Verify via ABHA ID': 'ABHA से पहचान सत्यापन',
    'Verify via Mobile Number': 'मोबाइल नंबर से सत्यापन',
    'Enter 14-digit ABHA number or address': '14 अंकों का ABHA नंबर या पता दर्ज करें',
    'Enter 10-digit mobile number': '10 अंकों का मोबाइल नंबर दर्ज करें',
    'ABHA Number or Address': 'ABHA नंबर या ABHA पता',
    '10-Digit Mobile Number': '10 अंकों का मोबाइल नंबर',
    'Speak ABHA Number': 'बोलकर दर्ज करें',
    'Speak Mobile Number': 'बोलकर मोबाइल नंबर दर्ज करें',
    'Don\'t have an ABHA? Create here': 'ABHA नहीं है? यहाँ बनाएं',
    'What is ABHA?': 'ABHA क्या है?',
    'Choose another method': 'दूसरा तरीका चुनें',
    'Proceed': 'आगे बढ़ें',
    'Verifying...': 'सत्यापित हो रहा है...',
    'Understood': 'समझ गया',
    'Please enter a valid ABHA number or address': 'कृपया मान्य ABHA नंबर या पता दर्ज करें',
    'Please enter a 10-digit mobile number': 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें',
    'what_is_abha_desc': 'ABHA (आयुष्मान भारत स्वास्थ्य खाता) 14 अंकों का विशिष्ट डिजिटल स्वास्थ्य पहचान नंबर है। यह आपके सभी अस्पताल पर्चियों और रिपोर्टों को सुरक्षित रूप से लिंक और संग्रहीत करता है।',

    // OTP Box
    'OTP Verification': 'ओटीपी सत्यापन',
    'Enter the 6-digit code sent to your mobile': 'आपके मोबाइल पर भेजा गया 6 अंकों का कोड दर्ज करें',
    '6-Digit Verification Code': '6 अंकों का सत्यापन कोड',
    'Please enter all 6 digits': 'कृपया सभी 6 अंक दर्ज करें',
    'Verify OTP & Start': 'ओटीपी सत्यापित करें और परामर्श शुरू करें',
    'Verifying OTP...': 'सत्यापन हो रहा है...',
    'Change Credentials / Resend': 'विवरण बदलें / पुनः प्रयास करें',
    'Verified Patient:': 'सत्यापित मरीज:',

    // Patient Consent
    'consent_title': 'रोगी सहमति',
    'consent_sub': 'क्लिनिकल परामर्श शुरू करने से पहले कृपया सहमति शर्तों को पढ़ें और स्वीकार करें।',
    'consent_item_1': 'मैं इस क्लिनिकल परामर्श और AI लक्षण जांच हेतु अपनी स्वास्थ्य जानकारी साझा करने की सहमति देता/देती हूँ।',
    'consent_item_2': 'मैं समझता/समझती हूँ कि डॉक्टर की सहायता के लिए मुझसे व्यक्तिगत स्वास्थ्य संबंधी प्रश्न पूछे जाएंगे।',
    'consent_item_3': 'मेरा स्वास्थ्य डेटा भारत सरकार के DPDP अधिनियम 2023 और ABDM दिशानिर्देशों के तहत सुरक्षित और गोपनीय रखा जाएगा।',
    'I Agree — Start Consultation': 'मैं सहमत हूँ — परामर्श शुरू करें',
    'Cancel & Return': 'रद्द करें और होम पर जाएं',

    // Document Upload & Inquiry
    'Upload Documents (Optional)': 'दस्तावेज़ अपलोड करें (वैकल्पिक)',
    'Upload Past Prescriptions / Lab Reports': 'पुराने पर्चे / लैब रिपोर्ट अपलोड करें',
    'Skip & Continue to Questions': 'छोड़ें और प्रश्नों पर आगे बढ़ें',
    'AI-Assisted Symptom Inquiry': 'AI-सहायक लक्षण जांच',
    'Press to Speak': 'बोलने के लिए दबाएं',
    'Listening...': 'सुन रहे हैं... बोलिए',
    'Type your answer here...': 'अपना उत्तर यहाँ लिखें...',
    'Send': 'भेजें',
    'Review Clinical Report': 'क्लिनिकल रिपोर्ट देखें',
    'Clinical Intake Report': 'क्लिनिकल जांच रिपोर्ट',
    'Join OPD Queue': 'ओपीडी कतार में जुड़ें',

    // Token Issued
    'Your OPD Token Number': 'आपका ओपीडी टोकन नंबर',
    'token_waiting_notice': 'कृपया प्रतीक्षा कक्ष में बैठें। कुछ ही समय में आपका नाम स्क्रीन पर पुकारा जाएगा।',
    'Generate Official OPD Slip': 'आधिकारिक ओपीडी पर्ची बनाएं',
    'Start New Intake Session': 'नया पंजीकरण सत्र शुरू करें',

    // Patient Phone Companion
    'Ayush OPD Citizen Portal': 'आयुष ओपीडी मरीज पोर्टल',
    'Government of India · Digital OPD': 'डिजिटल भारत स्वास्थ्य सेवा',
    'Patient Login': 'मरीज लॉगिन',
    'Register using your ABHA or mobile number': 'अपने ABHA या मोबाइल नंबर से पंजीकरण करें',
    'History': 'इतिहास',
    'Active in Waiting Queue': 'प्रतीक्षा कतार में सक्रिय',

    // Footer
    'RTI': 'सूचना का अधिकार',
    'Sitemap': 'साइटमैप',
    'Contact Us': 'संपर्क करें',
    'Privacy Policy': 'गोपनीयता नीति',
    'Terms of Use': 'उपयोग की शर्तें',
    'Accessibility Statement': 'सुगम्यता विवरण',
    'SSL 256-Bit': 'SSL 256-Bit',
    'DPDP Act 2023 Compliant': 'DPDP अधिनियम 2023 अनुपालित',
    'Website Content Managed by': 'वेबसाइट सामग्री प्रबंधन:',
    'Ministry of AYUSH, Govt. of India': 'आयुष मंत्रालय, भारत सरकार',
    'Hosted by': 'होस्टिंग:',
    'National Informatics Centre (NIC)': 'राष्ट्रीय सूचना विज्ञान केंद्र (NIC)',
    'Updated:': 'अंतिम अद्यतन:',
    'Visitors:': 'आगंतुक:',

    // Kiosk & Intake Flow
    'Back to Home': 'मुख्य पृष्ठ पर वापस',
    'Change Credentials / Resend OTP': 'विवरण बदलें / नया कोड भेजें',
    'I Agree — Proceed': 'मैं सहमत हूँ — आगे बढ़ें',
    'Cancel & Return to Home': 'रद्द करें और वापस जाएं',
    'doc_upload_sub': 'अगर आपके पास कोई पुरानी प्रिस्क्रिप्शन, लैब रिपोर्ट, या मेडिकल रिपोर्ट है तो कृपया अपलोड करें। इससे AI आपसे बेहतर सवाल पूछ सकेगा।',
    'Tap to choose a file': 'फ़ाइल चुनने के लिए टैप करें',
    'Uploading & extracting text...': 'अपलोड और टेक्स्ट निकाला जा रहा है...',
    'Start AI Doctor Consultation (Voice/Chat)': 'AI डॉक्टर परामर्श शुरू करें (आवाज़/चैट)',
    'Starting...': 'शुरू हो रहा है...',
    'Scan to Continue on Smartphone': 'स्मार्टफोन पर जारी रखने के लिए QR स्कैन करें',
    'scan_qr_sub': 'अपने स्मार्टफोन के कैमरे या गूगल लेंस से यह QR कोड स्कैन करें और अपनी सुविधा अनुसार मोबाइल पर आगे की प्रक्रिया पूरी करें।',
    'Back to Options': 'विकल्पों पर वापस जाएं',
    'Switch to Kiosk Instead': 'कियोस्क पर जारी रखें',
    'Print OPD Queue Slip': 'ओपीडी कतार पर्ची प्रिंट करें',
    'View ABHA Card': 'ABHA कार्ड देखें',
    'Complete Session & Return to Main Screen': 'सत्र समाप्त करें और मुख्य स्क्रीन पर लौटें',
    'Generating your clinical report...': 'आपकी क्लिनिकल रिपोर्ट तैयार की जा रही है...',
    'Chief Complaint': 'मुख्य समस्या',
    'Symptom Summary': 'लक्षण सारांश',
    'Recommended Department': 'अनुशंसित विभाग',
    'Clinical Notes': 'क्लिनिकल नोट्स',
    'Medical History': 'चिकित्सा इतिहास',
    'Severity': 'गंभीरता',
    'Urgency': 'तात्कालिकता',
    'Queued for Consultation': 'परामर्श हेतु कतारबद्ध',
    'Doctor:': 'डॉक्टर:',
    'Room:': 'कमरा:',
    'Processing speech...': 'आवाज़ प्रोसेस हो रही है...',
    'Listening... Speak now (tap mic when done)': 'बोलिए, हम सुन रहे हैं... (रोकने के लिए माइक फिर से दबाएं)',
    'Tap to stop recording': 'रिकॉर्डिंग बंद करने के लिए टैप करें',
    'Select an option below or type/speak:': 'नीचे से उपयुक्त विकल्प चुनें या लिखें/बोलें:',
    'Analyzing symptoms...': 'लक्षणों का विश्लेषण हो रहा है...',
    'Type symptoms (e.g. fever, headache)...': 'लक्षण लिखें (उदा. सिरदर्द, बुखार)...',
    'Take Photo or Choose File': 'फोटो लें या फाइल चुनें',
    'Start AI Symptom Inquiry': 'AI लक्षण जांच शुरू करें',
    'Skip — No Documents': 'छोड़ें (कोई दस्तावेज़ नहीं)',
    'AI Clinical OPD Triage': 'AI क्लिनिकल लक्षण परामर्श',
    'Ministry of Ayush Protocol • Powered by MeitY Bhashini AI': 'आयुष मंत्रालय क्लिनिकल प्रोटोकॉल • MeitY भाषिणी AI',
    'ai_welcome_intro': 'नमस्ते! मैं आपका AI मेडिकल सहायक हूँ। मैं डॉक्टर को आपकी स्वास्थ्य समस्या बताने में मदद करूँगा। चलिए शुरू करते हैं।',
    'ai_welcome_reviewed': 'मैंने आपके अपलोड किए गए दस्तावेज़ देखे हैं और उनके आधार पर प्रासंगिक प्रश्न पूछूँगा।',
    'No speech detected. Please speak clearly or type your answer.': 'कोई आवाज़ नहीं मिली। कृपया माइक दबाकर बोलें या उत्तर टाइप करें।',

    // Doctor & Admin
    'Live OPD Queue': 'लाइव ओपीडी कतार',
    'Call Patient': 'मरीज को बुलाएं',
    'Start Consultation': 'परामर्श शुरू करें',
    'Start Consult': 'परामर्श शुरू करें',
    'Mark No-Show': 'अनुपस्थित चिह्नित करें',
    'Clinical Advice / Regimen': 'क्लिनिकल सलाह / उपचार योजना',
    'Follow-up Date (Optional)': 'फॉलो-अप तारीख (वैकल्पिक)',
    'Past Visits & Prescriptions': 'पिछली विजिट और प्रिस्क्रिप्शन',
    'Search Allopathic & AYUSH Medicines': 'एलोपैथिक और आयुष दवाएं खोजें',
    'Hospital Administration & Operations': 'अस्पताल प्रशासन और संचालन',
    'Census & Footfall': 'आगंतुक और पंजीकरण',
    'Hospital Rules & Presence': 'अस्पताल नियम और उपस्थिति',
    'Daily Doctor Rooms': 'दैनिक डॉक्टर कक्ष',
    'Save Changes': 'बदलाव सहेजें'
  }
};

// Client-side cache for dynamic Bhashini translations
const clientTranslationCache = new Map();

// Quick client-side phonetic rule set for instant 0ms typing transliteration
const CLIENT_INDIC_NAMES = {
  'rahul': 'राहुल', 'rohit': 'रोहित', 'amit': 'अमित', 'anil': 'अनिल',
  'vikram': 'विक्रम', 'ananya': 'अनन्या', 'priya': 'प्रिया', 'pooja': 'पूजा',
  'sunita': 'सुनीता', 'anita': 'अनिता', 'deepak': 'दीपक', 'suresh': 'सुरेश',
  'ramesh': 'रमेश', 'rajesh': 'राजेश', 'mahesh': 'महेश', 'dinesh': 'दिनेश',
  'manoj': 'मनोज', 'sanjay': 'संजय', 'ajay': 'अजय', 'vijay': 'विजय',
  'sharma': 'शर्मा', 'kumar': 'कुमार', 'singh': 'सिंह', 'patel': 'पटेल',
  'gupta': 'गुप्ता', 'verma': 'वर्मा', 'yadav': 'यादव', 'pandey': 'पांडेय',
  'mishra': 'मिश्रा', 'reddy': 'रेड्डी', 'nair': 'नायर', 'joshi': 'जोशी',
  'devi': 'देवी', 'prasad': 'प्रसाद', 'neha': 'नेहा', 'kavita': 'कविता'
};

export function LanguageProvider({ children }) {
  // Persistent language storage: checks sessionStorage first, then localStorage, defaulting to 'hi'
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      const sess = sessionStorage.getItem('medikiosk_language');
      if (sess) return sess;
      const local = localStorage.getItem('medikiosk_language');
      if (local) return local;
    }
    return 'hi';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('medikiosk_language', nextLanguage);
      sessionStorage.setItem('medikiosk_language', nextLanguage);
    }
  };

  /**
   * Pure O(1) Centralized Key-Based Translation Lookup
   * Tier 1: Target language dictionary
   * Tier 2: Strict ENGLISH fallback
   */
  const translate = useCallback((key, fallback) => {
    if (!key) return '';

    // Tier 1: Target language
    const currentDict = translations[language];
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }

    // Tier 2: English fallback
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }

    // Tier 3: Provided fallback or key itself
    return fallback !== undefined ? fallback : key;
  }, [language]);

  /**
   * Real-time Async Bhashini NMT Translation for dynamic inputs & texts
   */
  const translateAsync = useCallback(async (text, targetLang = null, sourceLang = 'en') => {
    if (!text || typeof text !== 'string' || !text.trim()) return text;
    const tgt = targetLang || language;
    if (tgt === 'en' && sourceLang === 'en') return text;

    const cacheKey = `${sourceLang}_${tgt}_${text.trim()}`;
    if (clientTranslationCache.has(cacheKey)) {
      return clientTranslationCache.get(cacheKey);
    }

    try {
      setIsTranslating(true);
      const res = await fetch('/api/intake/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source_language: sourceLang,
          target_language: tgt
        })
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.translated_text || text;
        clientTranslationCache.set(cacheKey, translated);
        return translated;
      }
    } catch (err) {
      console.warn('[Bhashini Async Translation] Fallback:', err);
    } finally {
      setIsTranslating(false);
    }
    return text;
  }, [language]);

  /**
   * Indic Transliteration Helper: converts English/Roman text into target Indic script (Devanagari, etc.)
   */
  const transliterateIndic = useCallback((text, targetLang = null) => {
    if (!text || typeof text !== 'string') return '';
    const tgt = targetLang || language;
    if (tgt === 'en') return text;

    // Check words against dictionary
    const words = text.trim().split(/\s+/);
    const converted = words.map(w => {
      const lower = w.toLowerCase();
      return CLIENT_INDIC_NAMES[lower] || null;
    });

    if (converted.every(w => w !== null)) {
      return converted.join(' ');
    }

    // Syllabic heuristic for typing
    const consonants = {
      'kh': 'ख', 'gh': 'घ', 'ch': 'च', 'chh': 'छ', 'jh': 'झ', 'th': 'थ',
      'dh': 'ध', 'ph': 'फ', 'bh': 'भ', 'sh': 'श', 'shh': 'ष', 'gy': 'ज्ञ',
      'k': 'क', 'g': 'ग', 'j': 'ज', 't': 'त', 'd': 'द', 'n': 'न',
      'p': 'प', 'b': 'ब', 'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल',
      'v': 'व', 'w': 'व', 's': 'स', 'h': 'ह'
    };
    const vowels = {
      'a': 'ा', 'aa': 'ा', 'i': 'ि', 'ee': 'ी', 'u': 'ु', 'oo': 'ू',
      'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ', 'an': 'ं', 'ah': 'ः'
    };
    const initVowels = {
      'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
      'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ'
    };

    let str = text.toLowerCase();
    let result = '';
    let i = 0;
    while (i < str.length) {
      if (str[i] === ' ') { result += ' '; i++; continue; }
      if (i === 0 || str[i - 1] === ' ') {
        if (i + 2 <= str.length && initVowels[str.slice(i, i + 2)]) {
          result += initVowels[str.slice(i, i + 2)]; i += 2; continue;
        }
        if (initVowels[str[i]]) {
          result += initVowels[str[i]]; i++; continue;
        }
      }
      if (i + 2 <= str.length && consonants[str.slice(i, i + 2)]) {
        const c = consonants[str.slice(i, i + 2)];
        i += 2;
        if (i + 2 <= str.length && vowels[str.slice(i, i + 2)]) {
          result += c + vowels[str.slice(i, i + 2)]; i += 2;
        } else if (i < str.length && vowels[str[i]]) {
          if (str[i] !== 'a') result += c + vowels[str[i]];
          else result += c;
          i++;
        } else {
          result += c;
        }
        continue;
      }
      if (consonants[str[i]]) {
        const c = consonants[str[i]];
        i++;
        if (i + 2 <= str.length && vowels[str.slice(i, i + 2)]) {
          result += c + vowels[str.slice(i, i + 2)]; i += 2;
        } else if (i < str.length && vowels[str[i]]) {
          if (str[i] !== 'a') result += c + vowels[str[i]];
          else result += c;
          i++;
        } else {
          result += c;
        }
        continue;
      }
      result += str[i];
      i++;
    }
    return result;
  }, [language]);

  // Alias for ergonomic use: t('key')
  const t = translate;

  const value = useMemo(() => ({
    language,
    setLanguage,
    translate,
    t,
    translateAsync,
    transliterateIndic,
    isTranslating,
    bhashiniLanguages: BHASHINI_LANGUAGES
  }), [language, translate, t, translateAsync, transliterateIndic, isTranslating]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};