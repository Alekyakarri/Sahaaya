'use strict';
// Settings shared by the whole backend.
module.exports = {
  SLOTS: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
  START_POINT: 'Gollakoderu, Bhimavaram',   // demo start point used for Google Maps directions
  CAPACITY_PER_DAY: 40,                      // demo capacity: tokens per hospital department per day
  MAX_DAYS_AHEAD: 90,
  SESSION_DAYS: 7,
  // --- Local AI (LM Studio). Change these if your setup differs. ---
  LM_STUDIO_URL: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  // Models are tried in this order; the first one that answers is used. Override with SAHAAYA_MODEL.
  AI_MODELS: process.env.SAHAAYA_MODEL ? [process.env.SAHAAYA_MODEL] : ['gemma-3-1b-it', 'qwen3.5-0.8b', 'llama-3.2-1b-instruct'],
  AI_TIMEOUT_MS: 90000
};
