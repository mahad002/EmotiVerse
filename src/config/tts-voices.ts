/**
 * Kokoro TTS voices — official set only (Kokoro v0.19, 10 voicepacks).
 * American & British English. Source: Hugging Face geneing/Kokoro.
 */

export const KOKORO_LANGUAGES = [
  { value: 'default', label: 'Default / Mixed' },
  { value: 'a', label: 'American English' },
  { value: 'b', label: 'British English' },
] as const;

export interface KokoroVoice {
  id: string;
  lang: string;
  gender: 'f' | 'm' | 'mixed';
  name: string;
}

/** Official Kokoro v0.19 voices only (af, af_*, am_*, bf_*, bm_*). */
export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af', lang: 'default', gender: 'mixed', name: 'Bella + Sarah (blend)' },
  { id: 'af_bella', lang: 'a', gender: 'f', name: 'Bella' },
  { id: 'af_sarah', lang: 'a', gender: 'f', name: 'Sarah' },
  { id: 'af_nicole', lang: 'a', gender: 'f', name: 'Nicole' },
  { id: 'af_sky', lang: 'a', gender: 'f', name: 'Sky' },
  { id: 'am_adam', lang: 'a', gender: 'm', name: 'Adam' },
  { id: 'am_michael', lang: 'a', gender: 'm', name: 'Michael' },
  { id: 'bf_emma', lang: 'b', gender: 'f', name: 'Emma' },
  { id: 'bf_isabella', lang: 'b', gender: 'f', name: 'Isabella' },
  { id: 'bm_george', lang: 'b', gender: 'm', name: 'George' },
  { id: 'bm_lewis', lang: 'b', gender: 'm', name: 'Lewis' },
];

export const TTS_VOICE_STORAGE_KEY = 'emotiverse_tts_voice';
