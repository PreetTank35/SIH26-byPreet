/**
 * MeitY Bhashini API Service (National Language Translation Mission - Dhruva API)
 * Direct Inference Pipeline integration for ASR, TTS, and NMT Translation across Indian Languages.
 */

const DHRUVA_PIPELINE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

function getInferenceKey() {
  return process.env.BHASHINI_INFERENCE_KEY || 'MxJkNaHhumHgzQBiI5rrtWpWLdSDMJnoe9_vRku7oGhElwF3_GLKUxwB1QCa4Sim';
}

/**
 * Step 1: Compute Speech-to-Text (ASR) via Bhashini Dhruva
 * @param {string} base64Audio - Base64 encoded WAV audio
 * @param {string} language - 'hi' | 'en' | 'ta' | 'te' | 'mr' | 'bn' etc.
 * @param {string} audioFormat - 'wav' (recommended default for Dhruva ASR)
 */
async function speechToText(base64Audio, language = 'hi', audioFormat = 'wav') {
  const inferenceKey = getInferenceKey();
  if (!inferenceKey) {
    throw new Error('BHASHINI_INFERENCE_KEY is not configured');
  }

  // Normalize language code (e.g., 'hi-IN' -> 'hi', 'en-IN' -> 'en')
  const lang = (language || 'hi').split('-')[0].toLowerCase();

  const body = {
    pipelineTasks: [
      {
        taskType: 'asr',
        config: {
          language: { sourceLanguage: lang },
          audioFormat: audioFormat || 'wav'
        }
      }
    ],
    inputData: {
      audio: [{ audioContent: base64Audio }]
    }
  };

  const response = await fetch(DHRUVA_PIPELINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': inferenceKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Bhashini ASR] Error ${response.status}:`, errText);
    throw new Error(`Bhashini ASR Error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const transcript = result.pipelineResponse?.[0]?.output?.[0]?.source || '';
  return transcript;
}

// In-memory LRU cache for TTS responses (O(1) lookup, max 200 items)
const ttsCache = new Map();

/**
 * Step 2: Compute Text-to-Speech (TTS) via Bhashini Dhruva
 * @param {string} text - Text to synthesize
 * @param {string} language - 'hi' | 'en' | 'mr' etc.
 * @param {string} gender - 'female' | 'male'
 * @returns {Promise<string>} Base64 encoded audio string
 */
async function textToSpeech(text, language = 'hi', gender = 'female') {
  if (!text || typeof text !== 'string') return '';
  const lang = (language || 'hi').split('-')[0].toLowerCase();
  const cacheKey = `${lang}_${gender}_${text.trim()}`;
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }

  const inferenceKey = getInferenceKey();
  if (!inferenceKey) {
    throw new Error('BHASHINI_INFERENCE_KEY is not configured');
  }

  const body = {
    pipelineTasks: [
      {
        taskType: 'tts',
        config: {
          language: { sourceLanguage: lang },
          gender: gender || 'female'
        }
      }
    ],
    inputData: {
      input: [{ source: text }]
    }
  };

  const response = await fetch(DHRUVA_PIPELINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': inferenceKey
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2500)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Bhashini TTS] Error ${response.status}:`, errText);
    throw new Error(`Bhashini TTS Error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const audioContent = result.pipelineResponse?.[0]?.audio?.[0]?.audioContent || '';
  if (audioContent) {
    if (ttsCache.size >= 200) {
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, audioContent);
  }
  return audioContent;
}

const translationCache = new Map();

/**
 * Step 3: Compute Translation (NMT) via Bhashini Dhruva
 * @param {string} text - Input text
 * @param {string} sourceLanguage - e.g. 'en'
 * @param {string} targetLanguage - e.g. 'hi'
 */
async function translateText(text, sourceLanguage = 'en', targetLanguage = 'hi') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;

  const src = (sourceLanguage || 'en').split('-')[0].toLowerCase();
  const tgt = (targetLanguage || 'hi').split('-')[0].toLowerCase();

  if (src === tgt) return text;

  const cacheKey = `${src}_${tgt}_${text.trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const inferenceKey = getInferenceKey();
  if (!inferenceKey) return text;

  try {
    const body = {
      pipelineTasks: [
        {
          taskType: 'translation',
          config: {
            language: { sourceLanguage: src, targetLanguage: tgt }
          }
        }
      ],
      inputData: {
        input: [{ source: text }]
      }
    };

    const response = await fetch(DHRUVA_PIPELINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': inferenceKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) return text;

    const result = await response.json();
    const translated = result.pipelineResponse?.[0]?.output?.[0]?.target || text;
    if (translated) {
      translationCache.set(cacheKey, translated);
      // Bound cache size
      if (translationCache.size > 2000) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
    }
    return translated;
  } catch (err) {
    console.warn('[Bhashini NMT] Translation error, falling back to original text:', err.message);
    return text;
  }
}

/**
 * Phonetic transliteration map for Indian names from Roman/English to Devanagari & other Indic scripts
 */
const devanagariRules = [
  // Special combinations & names
  { en: 'sharma', hi: 'शर्मा' },
  { en: 'kumar', hi: 'कुमार' },
  { en: 'singh', hi: 'सिंह' },
  { en: 'patel', hi: 'पटेल' },
  { en: 'gupta', hi: 'गुप्ता' },
  { en: 'verma', hi: 'वर्मा' },
  { en: 'yadav', hi: 'यादव' },
  { en: 'pandey', hi: 'पांडेय' },
  { en: 'mishra', hi: 'मिश्रा' },
  { en: 'reddy', hi: 'रेड्डी' },
  { en: 'nair', hi: 'नायर' },
  { en: 'joshi', hi: 'जोशी' },
  { en: 'devi', hi: 'देवी' },
  { en: 'prasad', hi: 'प्रसाद' },
  { en: 'shree', hi: 'श्री' },
  { en: 'ramesh', hi: 'रमेश' },
  { en: 'suresh', hi: 'सुरेश' },
  { en: 'rajesh', hi: 'राजेश' },
  { en: 'mahesh', hi: 'महेश' },
  { en: 'dinesh', hi: 'दिनेश' },
  { en: 'amit', hi: 'अमित' },
  { en: 'anil', hi: 'अनिल' },
  { en: 'sunita', hi: 'सुनीता' },
  { en: 'anita', hi: 'अनिता' },
  { en: 'pooja', hi: 'पूजा' },
  { en: 'priya', hi: 'प्रिया' },
  { en: 'rahul', hi: 'राहुल' },
  { en: 'rohit', hi: 'रोहित' },
  { en: 'vikram', hi: 'विक्रम' },
  { en: 'ananya', hi: 'अनन्या' },
  { en: 'manoj', hi: 'मनोज' },
  { en: 'sanjay', hi: 'संजय' },
  { en: 'ajay', hi: 'अजय' },
  { en: 'vijay', hi: 'विजय' },
  { en: 'deepak', hi: 'दीपक' },
  { en: 'neha', hi: 'नेहा' },
  { en: 'kavita', hi: 'कविता' }
];

/**
 * Phonetic transliteration from Roman script to Indic script
 * @param {string} text - e.g. "Rahul Sharma"
 * @param {string} targetLanguage - e.g. 'hi'
 */
async function transliterateText(text, targetLanguage = 'hi') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  const lang = (targetLanguage || 'hi').split('-')[0].toLowerCase();

  // If already in Indic script, return text
  if (/[\u0900-\u0D7F]/.test(text)) {
    return text;
  }

  // Check known name tokens
  let words = text.trim().split(/\s+/);
  let convertedWords = words.map(word => {
    const cleanWord = word.toLowerCase();
    const match = devanagariRules.find(r => r.en === cleanWord);
    if (match) return match.hi;
    return null;
  });

  // If all words matched dictionary, return combined
  if (convertedWords.every(w => w !== null)) {
    return convertedWords.join(' ');
  }

  // Otherwise, use rule-based syllabic transliteration + fallback to Bhashini translation if available
  try {
    const bhashiniRes = await translateText(text, 'en', lang);
    if (bhashiniRes && bhashiniRes !== text) {
      return bhashiniRes;
    }
  } catch {}

  // Fallback to syllabic transliterator
  return ruleBasedTransliterate(text);
}

function ruleBasedTransliterate(text) {
  const vowels = {
    'a': 'ा', 'aa': 'ा', 'i': 'ि', 'ee': 'ी', 'u': 'ु', 'oo': 'ू',
    'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ', 'an': 'ं', 'ah': 'ः'
  };
  const initVowels = {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ'
  };
  const consonants = {
    'kh': 'ख', 'gh': 'घ', 'ch': 'च', 'chh': 'छ', 'jh': 'झ', 'th': 'थ',
    'dh': 'ध', 'ph': 'फ', 'bh': 'भ', 'sh': 'श', 'shh': 'ष', 'gy': 'ज्ञ',
    'k': 'क', 'g': 'ग', 'j': 'ज', 't': 'त', 'd': 'द', 'n': 'न',
    'p': 'प', 'b': 'ब', 'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल',
    'v': 'व', 'w': 'व', 's': 'स', 'h': 'ह'
  };

  let str = text.toLowerCase();
  let result = '';
  let i = 0;

  while (i < str.length) {
    if (str[i] === ' ') {
      result += ' ';
      i++;
      continue;
    }

    // Check 3-char consonant
    if (i + 3 <= str.length && consonants[str.slice(i, i + 3)]) {
      const c = consonants[str.slice(i, i + 3)];
      i += 3;
      // check next vowel
      if (i < str.length && vowels[str.slice(i, i + 2)]) {
        result += c + vowels[str.slice(i, i + 2)];
        i += 2;
      } else if (i < str.length && vowels[str[i]]) {
        if (str[i] !== 'a') result += c + vowels[str[i]];
        else result += c;
        i++;
      } else {
        result += c;
      }
      continue;
    }

    // Check 2-char consonant
    if (i + 2 <= str.length && consonants[str.slice(i, i + 2)]) {
      const c = consonants[str.slice(i, i + 2)];
      i += 2;
      if (i + 2 <= str.length && vowels[str.slice(i, i + 2)]) {
        result += c + vowels[str.slice(i, i + 2)];
        i += 2;
      } else if (i < str.length && vowels[str[i]]) {
        if (str[i] !== 'a') result += c + vowels[str[i]];
        else result += c;
        i++;
      } else {
        result += c;
      }
      continue;
    }

    // Check 1-char consonant
    if (consonants[str[i]]) {
      const c = consonants[str[i]];
      i++;
      if (i + 2 <= str.length && vowels[str.slice(i, i + 2)]) {
        result += c + vowels[str.slice(i, i + 2)];
        i += 2;
      } else if (i < str.length && vowels[str[i]]) {
        if (str[i] !== 'a') result += c + vowels[str[i]];
        else result += c;
        i++;
      } else {
        result += c;
      }
      continue;
    }

    // Initial vowels
    if (i === 0 || str[i - 1] === ' ') {
      if (i + 2 <= str.length && initVowels[str.slice(i, i + 2)]) {
        result += initVowels[str.slice(i, i + 2)];
        i += 2;
        continue;
      }
      if (initVowels[str[i]]) {
        result += initVowels[str[i]];
        i++;
        continue;
      }
    }

    result += str[i];
    i++;
  }

  return result;
}

/**
 * Legacy compatibility stub
 */
async function getPipelineConfig() {
  return {
    pipelineInferenceAPIEndPoint: { callbackUrl: DHRUVA_PIPELINE_URL }
  };
}

module.exports = {
  speechToText,
  textToSpeech,
  translateText,
  transliterateText,
  getPipelineConfig
};
