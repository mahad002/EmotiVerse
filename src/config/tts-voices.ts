/**
 * Kokoro TTS voices — official set only (Kokoro v0.19).
 * American & British English. Blend "af" removed (often unsupported by backends).
 */

export const KOKORO_LANGUAGES = [
  { value: 'a', label: 'American English' },
  { value: 'b', label: 'British English' },
] as const;

export interface KokoroVoice {
  id: string;
  lang: string;
  gender: 'f' | 'm';
  name: string;
}

/** Kokoro v0.19 voices (single voicepacks only; no blend). Default: af_bella. */
export const KOKORO_VOICES: KokoroVoice[] = [
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
