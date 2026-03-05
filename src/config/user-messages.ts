/**
 * User-facing messages only. No technical errors or stack traces.
 * Used for toasts and UI so users never see raw API/engine errors.
 */

export const USER_MESSAGES = {
  /** Voice / microphone */
  MIC_ACCESS: "We couldn't access your microphone. Check permissions and try again.",
  SPEECH_INPUT: "Voice input didn't work. Try again or type your message.",
  TRANSCRIPTION: "We couldn't understand that. Try again or type your message.",
  /** Conversation / AI */
  CONVERSATION: "Something went wrong. Please try again in a moment.",
  /** TTS is handled by falling back to text (no toast). */
  /** Image */
  IMAGE_GENERATION: "We couldn't create that image. Try again.",
} as const;
