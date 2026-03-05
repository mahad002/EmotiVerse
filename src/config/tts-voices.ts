/**
 * Full Kokoro TTS Voice List — Language → Gender → Voice (cascading).
 * Naming: [language][gender]_[name] e.g. af_bella (a=American, f=female).
 */

export const KOKORO_LANGUAGES = [
  { value: 'default', label: 'Default / Mixed' },
  { value: 'a', label: 'American English' },
  { value: 'b', label: 'British English' },
  { value: 'j', label: 'Japanese' },
  { value: 'c', label: 'Mandarin Chinese' },
  { value: 's', label: 'Spanish' },
  { value: 'f', label: 'French' },
  { value: 'h', label: 'Hindi' },
  { value: 'i', label: 'Italian' },
  { value: 'p', label: 'Portuguese (Brazil)' },
] as const;

export interface KokoroVoice {
  id: string;
  lang: string;
  gender: 'f' | 'm' | 'mixed';
  name: string;
}

/** Only these voices; structure matches official division. */
export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af', lang: 'default', gender: 'mixed', name: 'Bella + Sarah (blended)' },
  { id: 'af_bella', lang: 'a', gender: 'f', name: 'Bella' },
  { id: 'af_nicole', lang: 'a', gender: 'f', name: 'Nicole' },
  { id: 'af_sarah', lang: 'a', gender: 'f', name: 'Sarah' },
  { id: 'af_sky', lang: 'a', gender: 'f', name: 'Sky' },
  { id: 'af_heart', lang: 'a', gender: 'f', name: 'Heart' },
  { id: 'am_adam', lang: 'a', gender: 'm', name: 'Adam' },
  { id: 'am_michael', lang: 'a', gender: 'm', name: 'Michael' },
  { id: 'am_liam', lang: 'a', gender: 'm', name: 'Liam' },
  { id: 'bf_emma', lang: 'b', gender: 'f', name: 'Emma' },
  { id: 'bf_isabella', lang: 'b', gender: 'f', name: 'Isabella' },
  { id: 'bf_alice', lang: 'b', gender: 'f', name: 'Alice' },
  { id: 'bf_lily', lang: 'b', gender: 'f', name: 'Lily' },
  { id: 'bm_george', lang: 'b', gender: 'm', name: 'George' },
  { id: 'bm_lewis', lang: 'b', gender: 'm', name: 'Lewis' },
  { id: 'bm_arthur', lang: 'b', gender: 'm', name: 'Arthur' },
  { id: 'bm_charles', lang: 'b', gender: 'm', name: 'Charles' },
  { id: 'jf_alpha', lang: 'j', gender: 'f', name: 'Alpha' },
  { id: 'jf_yuki', lang: 'j', gender: 'f', name: 'Yuki' },
  { id: 'jf_mika', lang: 'j', gender: 'f', name: 'Mika' },
  { id: 'jf_hikari', lang: 'j', gender: 'f', name: 'Hikari' },
  { id: 'jm_kenta', lang: 'j', gender: 'm', name: 'Kenta' },
  { id: 'cf_xiaobei', lang: 'c', gender: 'f', name: 'Xiaobei' },
  { id: 'cf_ling', lang: 'c', gender: 'f', name: 'Ling' },
  { id: 'cf_mei', lang: 'c', gender: 'f', name: 'Mei' },
  { id: 'cf_qing', lang: 'c', gender: 'f', name: 'Qing' },
  { id: 'cm_jian', lang: 'c', gender: 'm', name: 'Jian' },
  { id: 'cm_hao', lang: 'c', gender: 'm', name: 'Hao' },
  { id: 'cm_wei', lang: 'c', gender: 'm', name: 'Wei' },
  { id: 'cm_bo', lang: 'c', gender: 'm', name: 'Bo' },
  { id: 'sf_valeria', lang: 's', gender: 'f', name: 'Valeria' },
  { id: 'sm_diego', lang: 's', gender: 'm', name: 'Diego' },
  { id: 'sm_carlos', lang: 's', gender: 'm', name: 'Carlos' },
  { id: 'ff_camille', lang: 'f', gender: 'f', name: 'Camille' },
  { id: 'hf_kavya', lang: 'h', gender: 'f', name: 'Kavya' },
  { id: 'hf_priya', lang: 'h', gender: 'f', name: 'Priya' },
  { id: 'hm_raj', lang: 'h', gender: 'm', name: 'Raj' },
  { id: 'hm_arjun', lang: 'h', gender: 'm', name: 'Arjun' },
  { id: 'if_giulia', lang: 'i', gender: 'f', name: 'Giulia' },
  { id: 'im_nicola', lang: 'i', gender: 'm', name: 'Nicola' },
  { id: 'pf_dora', lang: 'p', gender: 'f', name: 'Dora' },
  { id: 'pm_joao', lang: 'p', gender: 'm', name: 'João' },
  { id: 'pm_ricardo', lang: 'p', gender: 'm', name: 'Ricardo' },
];

export const TTS_VOICE_STORAGE_KEY = 'emotiverse_tts_voice';
