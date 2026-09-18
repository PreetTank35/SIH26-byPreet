/**
 * AI-Powered Clinical Doctor Inquiry Service (OpenRouter + Adaptive Clinical Doctor Pipeline)
 * 
 * Conducts a structured, adaptive doctor-level OPD case-taking interview.
 * ENFORCES A MINIMUM OF 6 STRUCTURED CLINICAL QUESTIONS before concluding:
 *   Stage 1: Chief Complaint (मुख्य स्वास्थ्य समस्या)
 *   Stage 2: Onset, Duration & Progression (समस्या की शुरुआत और अवधि)
 *   Stage 3: Character, Nature & Severity Scale (1-10 तीव्रता और दर्द की प्रकृति)
 *   Stage 4: Associated Symptoms & Critical Red Flags (अन्य जुड़े लक्षण व खतरे के संकेत)
 *   Stage 5: Aggravating & Relieving Factors (किससे समस्या बढ़ती या घटती है)
 *   Stage 6: Past Medical History, Medications, Document Insights & Allergies (इतिहास, दवाइयां व एलर्जी)
 * 
 * Works with OpenRouter LLMs (Gemma, Nemotron) with automatic fallback to our Adaptive Clinical
 * Doctor Decision Tree when rate-limited or offline.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model fallback chain
const MODEL_CHAIN = [
  process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free',
  process.env.OPENROUTER_MODEL_REASONING || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  process.env.OPENROUTER_MODEL_HEAVY || 'nvidia/nemotron-3-ultra-550b-a55b:free'
];

const MIN_QUESTIONS_REQUIRED = 6;

/**
 * Helper to extract and parse JSON from AI model text
 */
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endChar = '}';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }

  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf(endChar);
    if (endIdx > startIdx) {
      const candidate = cleaned.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) {
        try {
          const sanitized = candidate.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(sanitized);
        } catch (e2) {}
      }
    }
  }

  return null;
}

/**
 * Call OpenRouter API with model fallback chain
 */
async function callOpenRouter(messages, jsonMode = true, maxRetries = 0) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured in .env');
  }

  let lastError = null;

  for (const model of MODEL_CHAIN) {
    const strategies = jsonMode ? ['json_mode', 'no_json_mode'] : ['no_json_mode'];

    let skipModel = false;
    for (const strategy of strategies) {
      if (skipModel) break;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const body = {
            model,
            messages,
            temperature: 0.3,
            max_tokens: 3000
          };

          if (strategy === 'json_mode') {
            body.response_format = { type: 'json_object' };
          }

          const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://medikiosk.gov.in',
              'X-Title': 'MediKiosk OPD Intake'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
              lastError = new Error(`OpenRouter ${model} (429 Rate Limit)`);
              skipModel = true;
              break;
            }
            if (response.status >= 500) {
              lastError = new Error(`OpenRouter ${model} (${response.status}): ${errText}`);
              skipModel = true;
              break;
            }
            throw new Error(`OpenRouter API Error (${response.status}): ${errText}`);
          }

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '';

          if (!content.trim() && data.choices?.[0]?.message?.reasoning) {
            content = data.choices[0].message.reasoning;
          }

          if (!content.trim()) {
            throw new Error('Empty response from model');
          }

          if (jsonMode) {
            const parsed = extractJsonFromText(content);
            if (parsed) {
              return parsed;
            }
            throw new Error('Failed to parse AI response as JSON');
          }

          return content;

        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          }
        }
      }
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
}

/**
 * Identify primary clinical category from conversation history
 */
function detectClinicalCategory(conversationHistory = []) {
  const text = conversationHistory.map(h => `${h.question || ''} ${h.answer || ''}`).join(' ').toLowerCase();

  if (text.includes('chest') || text.includes('सीने') || text.includes('heart') || text.includes('दिल') || text.includes('breath') || text.includes('सांस')) {
    return 'cardiac_respiratory';
  }
  if (text.includes('stomach') || text.includes('पेट') || text.includes('vomit') || text.includes('उल्टी') || text.includes('digest') || text.includes('acid') || text.includes('gas') || text.includes('दस्त')) {
    return 'gastrointestinal';
  }
  if (text.includes('fever') || text.includes('बुखार') || text.includes('chill') || text.includes('cold') || text.includes('ठंड')) {
    return 'fever_infection';
  }
  if (text.includes('cough') || text.includes('खांसी') || text.includes('throat') || text.includes('गले') || text.includes('phlegm') || text.includes('बलगम')) {
    return 'respiratory_cough';
  }
  if (text.includes('joint') || text.includes('जोड़ों') || text.includes('back') || text.includes('कमर') || text.includes('muscle') || text.includes('knee') || text.includes('दर्द')) {
    return 'musculoskeletal';
  }
  if (text.includes('headache') || text.includes('सिरदर्द') || text.includes('dizz') || text.includes('चक्कर') || text.includes('migraine')) {
    return 'neurological';
  }
  if (text.includes('skin') || text.includes('त्वचा') || text.includes('rash') || text.includes('itch') || text.includes('खुजली') || text.includes('दाने')) {
    return 'dermatological';
  }
  return 'general';
}

/**
 * Adaptive Doctor Decision Tree
 * Generates clinical questions for Stages 1 to 6 dynamically adapted to the patient's condition
 */
function getAdaptiveDoctorQuestion(conversationHistory = [], documentContext = []) {
  const stage = conversationHistory.length + 1;
  const category = detectClinicalCategory(conversationHistory);
  const hasDocs = documentContext && documentContext.length > 0;

  // STAGE 1: CHIEF COMPLAINT (Handled by generateFirstQuestion)
  if (stage === 1) {
    return {
      id: 'q_ai_chief_complaint',
      stage: 1,
      type: 'single_choice',
      is_terminal: false,
      question: {
        en: 'Namaste. What is the primary health concern or symptom that brought you to the OPD today?',
        hi: 'नमस्ते। आज आप अस्पताल में किस मुख्य स्वास्थ्य समस्या या लक्षण के इलाज के लिए आए हैं?'
      },
      help_text: {
        en: 'Select the option closest to your condition, or speak into the microphone.',
        hi: 'अपनी समस्या से मिलता विकल्प चुनें, या माइक दबाकर बोलें।'
      },
      options: [
        { id: 'opt_fever', label: { en: 'Fever / Chills / Body Ache', hi: 'बुखार / कंपकंपी / शरीर में दर्द' } },
        { id: 'opt_chest', label: { en: 'Chest Pain / Heart / Breathlessness', hi: 'सीने में दर्द / दिल की घबराहट / सांस फूलना' } },
        { id: 'opt_stomach', label: { en: 'Stomach Pain / Gas / Vomiting / Acidity', hi: 'पेट दर्द / गैस / उल्टी / एसिडिटी' } },
        { id: 'opt_cough', label: { en: 'Cough / Cold / Sore Throat Infection', hi: 'खांसी / जुकाम / गले में खराश या दर्द' } },
        { id: 'opt_joint', label: { en: 'Joint / Back / Knee / Muscle Pain', hi: 'जोड़ों / कमर / घुटनों / मांसपेशियों में दर्द' } },
        { id: 'opt_headache', label: { en: 'Headache / Dizziness / Severe Migraine', hi: 'सिरदर्द / चक्कर आना / माइग्रेन' } },
        { id: 'opt_skin', label: { en: 'Skin Problem / Rash / Itching / Allergy', hi: 'त्वचा विकार / दाने / खुजली / एलर्जी' } },
        { id: 'opt_other', label: { en: 'General Medical Consultation / Other', hi: 'सामान्य परामर्श / अन्य समस्या' } }
      ]
    };
  }

  // STAGE 2: ONSET, DURATION & TIMING
  if (stage === 2) {
    let qEn = 'When did your symptoms start, and how have they been progressing?';
    let qHi = 'यह समस्या कब शुरू हुई, और यह समय के साथ कैसे बढ़ रही है?';
    let options = [
      { id: 'opt_s2_acute', label: { en: 'Started today (within last 24 hours)', hi: 'आज ही अचानक शुरू हुआ (24 घंटे के अंदर)' } },
      { id: 'opt_s2_few_days', label: { en: 'Present for 1 to 3 days', hi: 'पिछले 1 से 3 दिनों से है' } },
      { id: 'opt_s2_week', label: { en: 'About 4 to 7 days (around a week)', hi: '4 से 7 दिनों से (लगभग एक सप्ताह)' } },
      { id: 'opt_s2_chronic', label: { en: 'More than 2 weeks (prolonged/chronic)', hi: '2 सप्ताह से अधिक समय से (पुरानी समस्या)' } },
      { id: 'opt_s2_episodic', label: { en: 'Comes and goes intermittently', hi: 'रुक-रुक कर बार-बार होता है' } }
    ];

    if (category === 'cardiac_respiratory') {
      qEn = 'When did this chest discomfort or breathing trouble begin, and was the onset sudden or gradual?';
      qHi = 'सीने में यह तकलीफ या सांस फूलना कब शुरू हुआ, और क्या यह अचानक हुआ था या धीरे-धीरे?';
      options = [
        { id: 'opt_s2_cardiac_now', label: { en: 'Started suddenly within last 2 hours (Acute)', hi: 'पिछले 2 घंटों में अचानक शुरू हुआ (अति तीव्र)' } },
        { id: 'opt_s2_cardiac_today', label: { en: 'Started earlier today (few hours ago)', hi: 'आज ही कुछ घंटे पहले शुरू हुआ' } },
        { id: 'opt_s2_cardiac_days', label: { en: 'Episodes occurring over the last 2-3 days', hi: 'पिछले 2-3 दिनों से बार-बार हो रहा है' } },
        { id: 'opt_s2_cardiac_exertion', label: { en: 'Triggered specifically during walking/work', hi: 'चलने या काम करने पर उभरता है' } }
      ];
    } else if (category === 'fever_infection') {
      qEn = 'How many days have you had this fever, and does it come with severe shivering or chills?';
      qHi = 'आपको यह बुखार कितने दिनों से है, और क्या इसके साथ तेज ठंड या कंपकंपी भी होती है?';
      options = [
        { id: 'opt_s2_fever_today', label: { en: 'Started suddenly today with high fever', hi: 'आज ही तेज बुखार के साथ शुरू हुआ' } },
        { id: 'opt_s2_fever_23', label: { en: 'For the last 2 to 3 days continuously', hi: 'पिछले 2 से 3 दिनों से लगातार बना हुआ है' } },
        { id: 'opt_s2_fever_week', label: { en: 'Over a week, comes especially in evenings', hi: 'एक सप्ताह से अधिक, विशेषकर शाम को आता है' } },
        { id: 'opt_s2_fever_chill', label: { en: 'Severe chills and body aches every day', hi: 'रोजाना ठंड लगकर तेज कंपकंपी होती है' } }
      ];
    }

    return {
      id: 'q_ai_duration',
      stage: 2,
      type: 'single_choice',
      is_terminal: false,
      question: { en: qEn, hi: qHi },
      help_text: { en: 'Select the timeline that matches your condition.', hi: 'अपनी समस्या की सही अवधि चुनें।' },
      options
    };
  }

  // STAGE 3: NATURE & SEVERITY SCALE (1 to 10)
  if (stage === 3) {
    return {
      id: 'q_ai_severity',
      stage: 3,
      type: 'single_choice',
      is_terminal: false,
      question: {
        en: 'On a severity scale of 1 to 10 (where 1 is mild and 10 is unbearable pain), how intense is your discomfort, and what does it feel like?',
        hi: '1 से 10 के पैमाने पर (जहाँ 1 हल्का और 10 असहनीय दर्द है), आपकी तकलीफ कितनी गंभीर है और इसका अहसास कैसा है?'
      },
      help_text: {
        en: 'Select the severity level and character of pain/discomfort.',
        hi: 'अपनी तकलीफ की तीव्रता और प्रकार चुनें।'
      },
      options: [
        { id: 'opt_s3_mild', label: { en: 'Mild (1-3) — Light discomfort, can manage daily tasks', hi: 'हल्का (1-3) — सामान्य दिनचर्या में ज्यादा बाधा नहीं' } },
        { id: 'opt_s3_mod', label: { en: 'Moderate (4-6) — Noticeable pain, disturbs daily activities', hi: 'मध्यम (4-6) — काम करने में परेशानी हो रही है' } },
        { id: 'opt_s3_sev', label: { en: 'Severe (7-8) — Intense sharp pain, difficult to bear', hi: 'गंभीर (7-8) — तेज चुभन या असहनीय दर्द' } },
        { id: 'opt_s3_very_sev', label: { en: 'Critical (9-10) — Acute emergency-level distress', hi: 'अति गंभीर (9-10) — तुरंत आपातकालीन ध्यान चाहिए' } },
        { id: 'opt_s3_burning', label: { en: 'Burning / Acidic sensation', hi: 'जलन या एसिडिटी जैसा अहसास' } },
        { id: 'opt_s3_pressure', label: { en: 'Heavy pressure / Tightness or cramping', hi: 'भारीपन, दबाव या तेज मरोड़' } }
      ]
    };
  }

  // STAGE 4: ASSOCIATED SYMPTOMS & CLINICAL RED FLAGS
  if (stage === 4) {
    let qEn = 'Are you experiencing any other accompanying symptoms or warning signs?';
    let qHi = 'क्या आपको इसके साथ कोई अन्य लक्षण या परेशानी भी महसूस हो रही है?';
    let options = [
      { id: 'opt_s4_nausea', label: { en: 'Nausea, dizziness, or loss of appetite', hi: 'जी मिचलाना, चक्कर या भूख न लगना' } },
      { id: 'opt_s4_weakness', label: { en: 'Extreme fatigue, body ache, or weakness', hi: 'बहुत ज्यादा थकान, बदन दर्द या कमजोरी' } },
      { id: 'opt_s4_feverish', label: { en: 'Mild fever, chills, or headache', hi: 'हल्का बुखार, ठंड लगना या सिरदर्द' } },
      { id: 'opt_s4_sleep', label: { en: 'Difficulty sleeping or resting properly', hi: 'नींद न आना या बेचैनी' } },
      { id: 'opt_s4_none', label: { en: 'No other symptoms present', hi: 'कोई अन्य लक्षण नहीं हैं' } }
    ];

    if (category === 'cardiac_respiratory') {
      qEn = 'Do you experience shortness of breath, pain radiating to left arm/jaw, cold sweating, or dizziness?';
      qHi = 'क्या आपकी सांस फूल रही है, दर्द बाएं हाथ या जबड़े में जा रहा है, ठंडा पसीना या चक्कर आ रहे हैं?';
      options = [
        { id: 'opt_s4_cardiac_breath', label: { en: 'Yes — Shortness of breath & heavy sweating (Priority)', hi: 'हां — सांस फूल रही है और पसीना आ रहा है [अति महत्वपूर्ण]' } },
        { id: 'opt_s4_cardiac_radiate', label: { en: 'Pain radiates to left arm, shoulder, or neck', hi: 'दर्द बाएं हाथ, कंधे या गर्दन में फैल रहा है' } },
        { id: 'opt_s4_cardiac_palp', label: { en: 'Fast heartbeats (palpitations) or dizziness', hi: 'दिल की धड़कन तेज होना या चक्कर आना' } },
        { id: 'opt_s4_cardiac_none', label: { en: 'None of these warning signs', hi: 'इनमें से कोई गंभीर लक्षण नहीं है' } }
      ];
    } else if (category === 'gastrointestinal') {
      qEn = 'Along with stomach discomfort, do you have vomiting, loose motions, blood in stool, or inability to keep water down?';
      qHi = 'पेट दर्द के साथ क्या आपको लगातार उल्टी, दस्त, मल में खून या पानी भी न पचने जैसी समस्या है?';
      options = [
        { id: 'opt_s4_gi_vomit', label: { en: 'Severe vomiting & unable to digest water', hi: 'लगातार उल्टी हो रही है और पानी भी नहीं पच रहा' } },
        { id: 'opt_s4_gi_diarrhea', label: { en: 'Watery loose motions multiple times today', hi: 'आज कई बार पतले दस्त हुए हैं' } },
        { id: 'opt_s4_gi_acid', label: { en: 'Severe sour burps, heartburn, and bloating', hi: 'खट्टी डकारें, सीने में जलन और पेट फूलना' } },
        { id: 'opt_s4_gi_none', label: { en: 'Only pain/cramps, no vomiting or diarrhea', hi: 'केवल दर्द/मरोड़ है, उल्टी या दस्त नहीं' } }
      ];
    } else if (category === 'fever_infection') {
      qEn = 'Along with fever, do you have burning during urination, severe eye/headache pain, cough, or skin rash?';
      qHi = 'बुखार के साथ क्या आपको पेशाब में जलन, आंखों के पीछे तेज सिरदर्द, खांसी या शरीर पर लाल दाने हैं?';
      options = [
        { id: 'opt_s4_fever_uri', label: { en: 'Burning sensation or pain while urinating', hi: 'पेशाब करने में तेज जलन या दर्द' } },
        { id: 'opt_s4_fever_head', label: { en: 'Severe headache, behind-eye pain, joint ache', hi: 'तेज सिरदर्द, आंखों के पीछे दर्द और जोड़ों में दर्द' } },
        { id: 'opt_s4_fever_cough', label: { en: 'Persistent cough, sore throat & congestion', hi: 'लगातार खांसी, गले में खराश और कफ' } },
        { id: 'opt_s4_fever_none', label: { en: 'Only fever and body weakness', hi: 'केवल बुखार और शरीर में कमजोरी है' } }
      ];
    }

    return {
      id: 'q_ai_red_flags',
      stage: 4,
      type: 'single_choice',
      is_terminal: false,
      question: { en: qEn, hi: qHi },
      help_text: { en: 'Identifying these helps the doctor determine urgency.', hi: 'इनकी पहचान से डॉक्टर प्राथमिकता तय करते हैं।' },
      options
    };
  }

  // STAGE 5: AGGRAVATING & RELIEVING FACTORS
  if (stage === 5) {
    return {
      id: 'q_ai_factors',
      stage: 5,
      type: 'single_choice',
      is_terminal: false,
      question: {
        en: 'Does anything specific make your discomfort worse or better (for example: physical exertion, eating food, empty stomach, taking rest, or bending)?',
        hi: 'क्या किसी खास चीज से आपकी तकलीफ बढ़ती या कम होती है (जैसे: चलने-फिरने से, खाना खाने से, खाली पेट रहने से, या आराम करने से)?'
      },
      help_text: {
        en: 'Select what impacts your symptoms the most.',
        hi: 'चुनें कि किस स्थिति में लक्षण बदलते हैं।'
      },
      options: [
        { id: 'opt_s5_exertion', label: { en: 'Worse with physical movement, walking, or exertion', hi: 'चलने-फिरने या काम करने से तकलीफ बढ़ जाती है' } },
        { id: 'opt_s5_food_after', label: { en: 'Worse after eating meals or oily/spicy food', hi: 'खाना खाने या तला-भुना खाने के बाद बढ़ता है' } },
        { id: 'opt_s5_empty_stomach', label: { en: 'Worse on empty stomach, slightly better after eating', hi: 'खाली पेट ज्यादा होता है, कुछ खाने पर राहत' } },
        { id: 'opt_s5_rest', label: { en: 'Significantly better after lying down and resting', hi: 'आराम करने या लेटने से काफी राहत मिलती है' } },
        { id: 'opt_s5_meds', label: { en: 'Temporarily relieved by over-the-counter medicine', hi: 'दवा की गोली लेने से कुछ देर आराम रहता है' } },
        { id: 'opt_s5_constant', label: { en: 'Continuous — no change with rest or food', hi: 'लगातार एक जैसा बना रहता है — कोई फर्क नहीं' } }
      ]
    };
  }

  // STAGE 6: MEDICAL HISTORY, CURRENT MEDICATIONS, DOCUMENT CONTEXT & ALLERGIES
  if (stage === 6) {
    let qEn = 'Do you have any existing chronic conditions (such as Diabetes, High Blood Pressure, Thyroid, Asthma, Heart disease), what medicines are you taking, and do you have any drug allergies?';
    let qHi = 'क्या आपको पहले से कोई बीमारी है (जैसे शुगर, हाई ब्लड प्रेशर, थायराइड, दमा, दिल की बीमारी), आप कौन सी दवाइयां ले रहे हैं, और क्या कोई दवा से एलर्जी है?';

    if (hasDocs) {
      qEn = 'We have also reviewed your uploaded medical document. Do you have any diagnosed chronic conditions (BP, Diabetes, Thyroid, Asthma), are you currently taking any prescribed medications, or do you have drug allergies?';
      qHi = 'हमने आपके द्वारा अपलोड किए गए मेडिकल दस्तावेज़ को भी देखा है। क्या आपको कोई पुरानी बीमारी है (बीपी, शुगर, थायराइड, दमा), आप नियमित कौन सी दवा ले रहे हैं, और क्या किसी दवा से एलर्जी है?';
    }

    return {
      id: 'q_ai_medical_history',
      stage: 6,
      type: 'single_choice',
      is_terminal: false,
      question: { en: qEn, hi: qHi },
      help_text: { en: 'Crucial for safe doctor prescription and diagnosis.', hi: 'डॉक्टर द्वारा सुरक्षित दवा लिखने के लिए यह बहुत जरूरी है।' },
      options: [
        { id: 'opt_s6_healthy', label: { en: 'No chronic diseases & no known drug allergies', hi: 'कोई पुरानी बीमारी नहीं है और कोई दवा एलर्जी नहीं है' } },
        { id: 'opt_s6_htn', label: { en: 'High Blood Pressure (Hypertension)', hi: 'हाई ब्लड प्रेशर (बीपी की समस्या)' } },
        { id: 'opt_s6_diabetes', label: { en: 'Diabetes Mellitus (High Blood Sugar)', hi: 'मधुमेह / डायबिटीज (शुगर की बीमारी)' } },
        { id: 'opt_s6_thyroid_asthma', label: { en: 'Thyroid disorder / Asthma / Breathing problem', hi: 'थायराइड विकार / दमा / सांस की पुरानी बीमारी' } },
        { id: 'opt_s6_daily_meds', label: { en: 'Currently taking daily doctor-prescribed medicines', hi: 'रोजाना डॉक्टर की बताई दवाइयां ले रहे हैं' } },
        { id: 'opt_s6_allergy', label: { en: 'Known drug allergy (e.g., Penicillin, Sulfa, Painkillers)', hi: 'दवा से एलर्जी है (जैसे पेनिसिलिन, सल्फा, दर्दनिवारक)' } }
      ]
    };
  }

  // STAGE >= 7: INQUIRY COMPLETION (All 6 minimum questions completed)
  return {
    id: 'q_ai_terminal',
    is_terminal: true,
    question: {
      en: 'Thank you for answering all 6 clinical assessment questions. I have evaluated your symptoms, duration, severity, red flags, triggers, and medical history. Your OPD clinical intake report is now being generated.',
      hi: 'सभी 6 नैदानिक प्रश्नों के उत्तर देने के लिए धन्यवाद। आपके लक्षणों, अवधि, तीव्रता, खतरे के संकेतों और मेडिकल इतिहास का विश्लेषण पूरा हो गया है। आपकी ओपीडी रिपोर्ट तैयार की जा रही है।'
    },
    options: []
  };
}

/**
 * Generate the FIRST inquiry question (Stage 1: Chief Complaint)
 */
async function generateFirstQuestion(language = 'en') {
  const fallbackQ = getAdaptiveDoctorQuestion([], []);

  const systemPrompt = `You are an expert OPD Doctor conducting a structured clinical intake interview at an Indian Government Hospital.
Your goal is to ask the patient their CHIEF COMPLAINT (primary reason for visiting today).
Provide 6 to 8 clear, realistic options with bilingual English and Hindi labels.

Return ONLY valid JSON:
{
  "id": "q_ai_chief_complaint",
  "question": { "en": "...", "hi": "..." },
  "help_text": { "en": "...", "hi": "..." },
  "type": "single_choice",
  "options": [
    { "id": "opt_1", "label": { "en": "...", "hi": "..." } }
  ]
}`;

  try {
    const result = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the first chief complaint question for an incoming OPD patient.' }
    ]);
    if (result && result.question && result.options?.length > 0) {
      return result;
    }
  } catch (err) {
    console.log('[AI Doctor] Using clinical adaptive Stage 1 question (OpenRouter unavailable)');
  }

  return fallbackQ;
}

/**
 * Generate an adaptive doctor follow-up question
 * ENFORCES MINIMUM OF 6 QUESTIONS BEFORE TERMINATION!
 */
async function generateFollowUpQuestion(conversationHistory = [], language = 'en', documentContext = []) {
  const questionCount = conversationHistory.length;

  // If already asked 6 or more questions, conclude the inquiry!
  if (questionCount >= MIN_QUESTIONS_REQUIRED) {
    return {
      id: 'q_ai_terminal',
      is_terminal: true,
      question: {
        en: 'Thank you for answering all 6 clinical assessment questions. I have evaluated your symptoms, duration, severity, red flags, triggers, and medical history. Your OPD clinical intake report is now being generated.',
        hi: 'सभी 6 नैदानिक प्रश्नों के उत्तर देने के लिए धन्यवाद। आपके लक्षणों, अवधि, तीव्रता, खतरे के संकेतों और मेडिकल इतिहास का विश्लेषण पूरा हो गया है। आपकी ओपीडी रिपोर्ट तैयार की जा रही है।'
      },
      options: []
    };
  }

  // Get the deterministic, clinical-grade question for this stage
  const adaptiveDoctorQ = getAdaptiveDoctorQuestion(conversationHistory, documentContext);

  const docContextSection = documentContext && documentContext.length > 0
    ? `\nUploaded Medical Documents OCR:\n${documentContext.map((t, i) => `[Doc ${i + 1}]: ${t}`).join('\n')}`
    : '';

  const systemPrompt = `You are an expert OPD Doctor conducting a structured clinical intake interview at an Indian Government Hospital.
You MUST ask AT LEAST 6 clinical questions before concluding.
Currently, this is Question #${questionCount + 1} of 6.
You are STRICTLY FORBIDDEN from setting "is_terminal": true until at least 6 questions have been answered.

Conversation history so far:
${conversationHistory.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n\n')}${docContextSection}

Clinical stages to cover:
- Q1: Chief complaint
- Q2: Onset, duration, and progression
- Q3: Severity scale (1-10) and sensation character
- Q4: Associated symptoms and critical red flags
- Q5: Aggravating and relieving factors (triggers, food, rest)
- Q6: Past medical history, medications, uploaded document insights, and allergies

Ask ONE focused follow-up question for Question #${questionCount + 1}. Provide 4-6 bilingual options (EN + HI).
Set "is_terminal": false.

Return ONLY valid JSON:
{
  "id": "q_ai_${questionCount + 1}",
  "question": { "en": "...", "hi": "..." },
  "help_text": { "en": "...", "hi": "..." },
  "type": "single_choice",
  "is_terminal": false,
  "options": [
    { "id": "opt_${questionCount + 1}_1", "label": { "en": "...", "hi": "..." } }
  ]
}`;

  try {
    const result = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate question #${questionCount + 1} now. "is_terminal" MUST be false.` }
    ]);

    if (result && result.question && result.options?.length > 0) {
      // Force is_terminal to false if minimum questions not reached
      result.is_terminal = false;
      return result;
    }
  } catch (err) {
    console.log(`[AI Doctor] Question #${questionCount + 1}: Using adaptive clinical engine (OpenRouter: ${err.message})`);
  }

  // Fallback to our rock-solid clinical adaptive doctor engine
  return adaptiveDoctorQ;
}

/**
 * Map a free-text or voice transcript to one of the valid options using AI
 */
async function aiMapTranscriptToOption(transcript, validOptions = [], language = 'en') {
  if (!transcript || !validOptions || validOptions.length === 0) {
    return { matched_option_id: null, confidence: 0, raw_transcript: transcript };
  }

  // Direct label substring match first (instant, robust)
  const cleanTranscript = transcript.toLowerCase().trim();
  for (const opt of validOptions) {
    const enLabel = (opt.label?.en || '').toLowerCase();
    const hiLabel = (opt.label?.hi || '').toLowerCase();
    if (cleanTranscript.includes(enLabel) || enLabel.includes(cleanTranscript) ||
        cleanTranscript.includes(hiLabel) || hiLabel.includes(cleanTranscript)) {
      return {
        matched_option_id: opt.id,
        confidence: 0.95,
        option_label: opt.label,
        raw_transcript: transcript
      };
    }
  }

  // Try OpenRouter AI mapping if key available
  try {
    const systemPrompt = `You are an AI that maps spoken patient responses to predefined clinical options.
Patient said: "${transcript}"

Options:
${validOptions.map(o => `- ID: "${o.id}" | EN: "${o.label?.en}" | HI: "${o.label?.hi}"`).join('\n')}

Return ONLY JSON:
{
  "matched_option_id": "the best matching option ID or null",
  "confidence": 0.0 to 1.0
}`;

    const result = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Map: "${transcript}"` }
    ]);

    return {
      matched_option_id: result?.matched_option_id || null,
      confidence: result?.confidence || 0.8,
      option_label: validOptions.find(o => o.id === result?.matched_option_id)?.label,
      raw_transcript: transcript
    };
  } catch {
    return { matched_option_id: null, confidence: 0, raw_transcript: transcript, fallback_to_touch: true };
  }
}

/**
 * Generate a comprehensive clinical report from the 6-question doctor intake
 */
async function generateClinicalReport(conversationHistory = [], patientInfo = {}, medicalHistory = [], language = 'en', ocrTexts = []) {
  const ocrSection = ocrTexts.length > 0
    ? `\nUploaded Medical Documents OCR:\n${ocrTexts.map((t, i) => `--- Doc ${i + 1} ---\n${t}`).join('\n\n')}`
    : '';

  // Extract structured answers from conversation
  const q1 = conversationHistory[0]?.answer || 'General health concern';
  const q2 = conversationHistory[1]?.answer || 'Not specified';
  const q3 = conversationHistory[2]?.answer || 'Moderate';
  const q4 = conversationHistory[3]?.answer || 'None reported';
  const q5 = conversationHistory[4]?.answer || 'No specific factor';
  const q6 = conversationHistory[5]?.answer || 'No chronic history';

  // Clinical severity calculation
  const q3Lower = q3.toLowerCase();
  const isSevere = q3Lower.includes('severe') || q3Lower.includes('7') || q3Lower.includes('8') || q3Lower.includes('9') || q3Lower.includes('10') || q3Lower.includes('critical');
  const isMild = q3Lower.includes('mild') || q3Lower.includes('1') || q3Lower.includes('2') || q3Lower.includes('3');
  const severityAssessment = isSevere ? 'severe' : (isMild ? 'mild' : 'moderate');

  // Department triage calculation
  const cat = detectClinicalCategory(conversationHistory);
  let dept = 'General Medicine';
  let urgency = 'routine';

  if (cat === 'cardiac_respiratory') {
    dept = isSevere ? 'Emergency / Cardiology' : 'General Medicine (Cardio Triage)';
    urgency = isSevere ? 'urgent' : 'priority';
  } else if (cat === 'gastrointestinal') {
    dept = 'Gastroenterology / General Medicine';
    urgency = isSevere ? 'urgent' : 'priority';
  } else if (cat === 'musculoskeletal') {
    dept = 'Orthopedics / AYUSH (Panchakarma)';
    urgency = isSevere ? 'priority' : 'routine';
  } else if (cat === 'dermatological') {
    dept = 'Dermatology';
    urgency = 'routine';
  } else if (cat === 'fever_infection') {
    dept = isSevere ? 'General Medicine (Infectious Diseases)' : 'General Medicine / AYUSH';
    urgency = isSevere ? 'priority' : 'routine';
  }

  // Construct fallback clinical report
  const fallbackReport = {
    chief_complaint: q1,
    symptom_summary: `Chief Complaint: ${q1}. Onset & Duration: ${q2}. Severity & Nature: ${q3}. Associated Symptoms: ${q4}. Triggers/Aggravating Factors: ${q5}.`,
    severity_assessment: severityAssessment,
    recommended_department: dept,
    symptom_tags: [cat, severityAssessment],
    clinical_notes: `Clinical Doctor Triage (6-Stage Assessment completed). Medical History & Medications: ${q6}.${ocrTexts.length > 0 ? ` Patient uploaded ${ocrTexts.length} medical document(s) for doctor review.` : ''}`,
    history_summary: q6,
    urgency_flag: urgency,
    report_text_en: `Patient ${patientInfo?.name || 'Citizen'} presented with ${q1}. Symptoms onset: ${q2}. Severity assessed as ${severityAssessment.toUpperCase()} (${q3}). Associated findings: ${q4}. Factors affecting symptoms: ${q5}. Medical history: ${q6}.${ocrTexts.length > 0 ? ' Relevant uploaded medical records attached.' : ''} Recommended for ${dept} evaluation with ${urgency.toUpperCase()} priority.`,
    report_text_hi: `मरीज ${patientInfo?.name || 'नागरिक'} ने ${q1} की मुख्य शिकायत दर्ज कराई। लक्षणों की अवधि: ${q2}। गंभीरता: ${severityAssessment === 'severe' ? 'गंभीर' : (severityAssessment === 'mild' ? 'हल्का' : 'मध्यम')} (${q3})। जुड़े लक्षण: ${q4}। मेडिकल इतिहास व दवाइयां: ${q6}। ${dept} विभाग में परामर्श की सिफारिश की गई है।`
  };

  // Try OpenRouter to enrich report if available
  const systemPrompt = `You are a clinical AI report generator at an Indian Government Hospital.
Generate a professional clinical intake report based on the 6 completed clinical inquiry questions:
Q1 (Complaint): ${q1}
Q2 (Onset/Duration): ${q2}
Q3 (Severity): ${q3}
Q4 (Associated/Red Flags): ${q4}
Q5 (Triggers/Relieving): ${q5}
Q6 (Medical History & Medications): ${q6}${ocrSection}

Return ONLY valid JSON matching this schema:
{
  "chief_complaint": "1-2 sentences",
  "symptom_summary": "detailed clinical synthesis of all 6 stages",
  "severity_assessment": "mild | moderate | severe",
  "recommended_department": "department name",
  "symptom_tags": ["tag1", "tag2"],
  "clinical_notes": "clinical observations and risk factors",
  "history_summary": "past history and medications",
  "urgency_flag": "routine | priority | urgent",
  "report_text_en": "Full professional English doctor report",
  "report_text_hi": "Full professional Hindi doctor report"
}`;

  try {
    const result = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Synthesize the clinical intake report now.' }
    ]);
    if (result && result.chief_complaint && result.report_text_en) {
      return result;
    }
  } catch (err) {
    console.log('[AI Doctor] Using clinical synthesis report generator');
  }

  return fallbackReport;
}

/**
 * Extract text from an image using OpenRouter Vision model
 */
async function extractTextFromImage(base64Image, mimeType = 'image/jpeg') {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are a medical document OCR assistant. Extract ALL readable text from this medical document image (prescription, lab report, discharge summary).
Preserve headers, medications, dosages, lab values, and doctor notes. Output ONLY extracted text.`
        },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }
      ]
    }
  ];

  try {
    const result = await callOpenRouter(messages, false, 0);
    return result || '';
  } catch (err) {
    console.error('[AI] Vision OCR failed:', err.message);
    throw err;
  }
}

module.exports = {
  MIN_QUESTIONS_REQUIRED,
  generateFirstQuestion,
  generateFollowUpQuestion,
  aiMapTranscriptToOption,
  generateClinicalReport,
  extractTextFromImage
};
