'use strict';
// Talks to LM Studio's OpenAI-compatible server. No API key is needed.
const { LM_STUDIO_URL, AI_MODELS, AI_TIMEOUT_MS } = require('./config');
const { HttpError } = require('./util');

const LANG_NAME = { en: 'English', te: 'Telugu', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada' };
const EMERGENCY = [
  /chest pain|heart attack|can'?t breathe|cannot breathe|trouble breathing|difficulty breathing|not breathing|unconscious|passed out|severe bleeding|bleeding (a lot|heavily)|stroke|seizure|poison|overdose|snake ?bite|suicid|kill myself|want to die|serious accident/i,
  /सीने में दर्द|सांस (नहीं|लेने में तकलीफ)|ఛాతీ నొప్పి|ఊపిరి ఆడటం లేదు|நெஞ்சு வலி|மூச்சு விட முடியவில்லை|ಎದೆ ನೋವು|ಉಸಿರಾಡಲು ಕಷ್ಟ/
];
const EMERGENCY_TEXT = {
  en: 'This may be an emergency. Call 112 now (ambulance: 108) or go to the nearest hospital immediately. Sahaaya cannot diagnose or treat you, so please get professional emergency help right away.',
  hi: 'यह आपात स्थिति लग रही है। अभी 112 पर कॉल करें (एम्बुलेंस: 108) या तुरंत नज़दीकी अस्पताल जाएं।',
  te: 'ఇది అత్యవసర పరిస్థితిలా ఉంది. ఇప్పుడే 112కు కాల్ చేయండి (అంబులెన్స్: 108) లేదా వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి.',
  ta: 'இது அவசர நிலை போல் தெரிகிறது. இப்போதே 112 ஐ அழைக்கவும் (ஆம்புலன்ஸ்: 108) அல்லது உடனே அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும்.',
  kn: 'ಇದು ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಂತೆ ಕಾಣುತ್ತದೆ. ಈಗಲೇ 112 ಕ್ಕೆ ಕರೆ ಮಾಡಿ (ಆಂಬ್ಯುಲೆನ್ಸ್: 108) ಅಥವಾ ತಕ್ಷಣ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಿ.'
};
// The fixed emergency answer is returned BEFORE any model is asked.
const emergencyReply = (msg, lang) => EMERGENCY.some(r => r.test(msg))
  ? (lang === 'en' ? EMERGENCY_TEXT.en : EMERGENCY_TEXT[lang] + '\n' + EMERGENCY_TEXT.en) : null;

const SYSTEM = lang => `You are Sahaaya Assistant, a helper inside a hospital navigation app for Bhimavaram, India.
Rules:
- Use ONLY the hospital facts given below. If the answer is not in the facts, say you do not know.
- You are not a doctor. Never diagnose, never suggest medicines or doses. For any health worry, suggest seeing a doctor.
- For emergencies, tell the person to call 112.
- Numbers about queues, beds and doctors come from a SIMULATED digital twin, so call them "estimated" or "simulated".
- Answer in ${LANG_NAME[lang] || 'English'}. If you cannot write that language well, answer in simple English instead.
- Keep answers short: at most 4 sentences.`;

const clean = t => {
  let s = String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
  const i = s.search(/<think>/i); if (i >= 0) s = s.slice(0, i);     // unfinished reasoning block
  s = s.trim(); return s.length > 1200 ? s.slice(0, 1200) + '...' : s;
};
const down = () => new HttpError(503, 'The AI model is not available. Open LM Studio, load a model and switch on the server (port 1234), then try again.');

async function chat(messages, maxTokens = 300) {
  for (const model of AI_MODELS) {
    let res;
    try {
      res = await fetch(LM_STUDIO_URL + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: maxTokens, stream: false }), signal: AbortSignal.timeout(AI_TIMEOUT_MS) });
    } catch (e) { throw down(); }                        // server off or too slow: do not try other models
    if (!res.ok) continue;                               // this model is not available: try the next one
    let j; try { j = await res.json(); } catch (e) { continue; }
    const text = clean(j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
    if (text) return { text, model };
  }
  throw new HttpError(503, 'LM Studio is running but none of the configured models answered. Load one in LM Studio (see AI_MODELS in config.js).');
}

async function status() {
  try {
    const r = await fetch(LM_STUDIO_URL + '/models', { signal: AbortSignal.timeout(2500) });
    const j = await r.json();
    return { available: true, models: (j.data || []).map(m => m.id).filter(id => !/embed/i.test(id)) };
  } catch (e) { return { available: false, models: [] }; }
}
module.exports = { chat, status, emergencyReply, SYSTEM, LANG_NAME };
