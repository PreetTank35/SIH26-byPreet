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

/**
 * Step 2: Compute Text-to-Speech (TTS) via Bhashini Dhruva
 * @param {string} text - Text to synthesize
 * @param {string} language - 'hi' | 'en' | 'mr' etc.
 * @param {string} gender - 'female' | 'male'
 * @returns {Promise<string>} Base64 encoded audio string
 */
async function textToSpeech(text, language = 'hi', gender = 'female') {
  const inferenceKey = getInferenceKey();
  if (!inferenceKey) {
    throw new Error('BHASHINI_INFERENCE_KEY is not configured');
  }

  const lang = (language || 'hi').split('-')[0].toLowerCase();

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
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Bhashini TTS] Error ${response.status}:`, errText);
    throw new Error(`Bhashini TTS Error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const audioContent = result.pipelineResponse?.[0]?.audio?.[0]?.audioContent || '';
  return audioContent;
}

/**
 * Step 3: Compute Translation (NMT) via Bhashini Dhruva
 * @param {string} text - Input text
 * @param {string} sourceLanguage - e.g. 'en'
 * @param {string} targetLanguage - e.g. 'hi'
 */
async function translateText(text, sourceLanguage = 'en', targetLanguage = 'hi') {
  const inferenceKey = getInferenceKey();
  if (!inferenceKey) return text;

  const src = (sourceLanguage || 'en').split('-')[0].toLowerCase();
  const tgt = (targetLanguage || 'hi').split('-')[0].toLowerCase();

  if (src === tgt) return text;

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
    return result.pipelineResponse?.[0]?.output?.[0]?.target || text;
  } catch (err) {
    console.warn('[Bhashini NMT] Translation error, falling back to original text:', err.message);
    return text;
  }
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
  getPipelineConfig
};
