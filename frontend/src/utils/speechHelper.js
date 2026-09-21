// Web Speech & Audio Controller for MediKiosk
// Ultra-low latency TTS & STT with absolute lifecycle cleanup (zero zombie audio on page exit)

let activeAudio = null;
let activeRecognition = null;
let activeAbortCtrl = null;
let speechSeq = 0;

/**
 * Hard stop of ALL speech synthesis, audio playback, recognition, and in-flight requests.
 * Guaranteed to silence audio immediately when navigating away or unmounting.
 */
export const stopAllSpeech = () => {
  // Invalidate any pending async callbacks
  speechSeq++;

  // 1. Abort any in-flight TTS or ASR network fetch
  if (activeAbortCtrl) {
    try {
      activeAbortCtrl.abort();
    } catch {}
    activeAbortCtrl = null;
  }

  // 2. Pause and completely release any HTML5 Audio element
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
      activeAudio.removeAttribute('src');
      activeAudio.load();
    } catch {}
    activeAudio = null;
  }

  // 3. Immediately cancel native browser speech synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  // 4. Abort any active speech recognition
  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {}
    activeRecognition = null;
  }
};

/**
 * Check if the browser is currently playing audio or synthesizing speech
 */
export const isSpeaking = () => {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  }
  return false;
};

/**
 * Get voices with caching for instant native speech response
 */
let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Play Assistant Question Speech with zero lag & instant abortability
 * @param {string} text - Text to speak
 * @param {string} lang - 'en' | 'hi'
 * @param {Object} options - Optional callbacks & config
 */
export const playAssistantSpeech = (text, lang = 'en', options = {}) => {
  if (!text || typeof text !== 'string') return null;

  // Immediately stop any prior speech before beginning new utterance
  stopAllSpeech();

  const currentSeq = speechSeq;

  // Primary Ultra-Low Latency Engine: Browser Native SpeechSynthesis (0ms delay, 0 network bandwidth)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(text.trim());
      const isHindi = lang === 'hi' || lang.startsWith('hi');
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select best natural voice
      const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => {
        const vLang = v.lang.toLowerCase();
        return isHindi 
          ? (vLang.includes('hi') || vLang.includes('hin'))
          : (vLang.includes('en-in') || vLang.includes('en-gb') || vLang.includes('en-us'));
      });

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onstart = () => {
        if (currentSeq !== speechSeq) {
          window.speechSynthesis.cancel();
          return;
        }
        options.onStart && options.onStart();
      };

      utterance.onend = () => {
        if (currentSeq === speechSeq) {
          options.onEnd && options.onEnd();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[Speech] Native TTS notice:', e.error);
        }
      };

      window.speechSynthesis.speak(utterance);
      return currentSeq;
    } catch (err) {
      console.warn('[Speech] Native speech failed, falling back:', err);
    }
  }

  return null;
};

/**
 * Legacy wrapper for compatibility with existing imports
 */
export const speakText = (text, lang = 'en') => {
  return playAssistantSpeech(text, lang);
};

/**
 * Web Speech API Utility for Speech-to-Text (STT) with lifecycle tracking
 */
export const startSpeechRecognition = ({ onResult, onEnd, onError, lang = 'en' }) => {
  const SpeechRecognition = typeof window !== 'undefined' 
    ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
    : null;

  if (!SpeechRecognition) {
    onError && onError('Speech recognition is not supported in this browser.');
    return null;
  }

  // Stop any active recognition before starting a new one
  if (activeRecognition) {
    try { activeRecognition.abort(); } catch {}
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = true; // Provides instant responsive feedback

  recognition.onresult = (event) => {
    let interim = '';
    let finalTranscript = '';
    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const transcript = finalTranscript || interim;
    onResult && onResult(transcript, Boolean(finalTranscript));
  };

  recognition.onerror = (event) => {
    if (activeRecognition === recognition) activeRecognition = null;
    onError && onError(event.error);
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) activeRecognition = null;
    onEnd && onEnd();
  };

  try {
    recognition.start();
    activeRecognition = recognition;
    return recognition;
  } catch (err) {
    onError && onError(err.message);
    return null;
  }
};
