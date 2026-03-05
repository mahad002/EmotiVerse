'use server';

/**
 * @fileOverview A Text-to-Speech (TTS) AI flow.
 *
 * - textToSpeech - A function that converts text into speech audio.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 *
 * Uses LiteLLM (Kokoro) for TTS instead of Gemini.
 */

import { z } from 'zod';
import { litellmTextToSpeech } from '@/ai/litellm-client';
import { getValidTtsVoice } from '@/config/tts-voices';

const TextToSpeechInputSchema = z.union([
  z.string(),
  z.object({ text: z.string(), voice: z.string().optional() }),
]);
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
  const parsed = typeof input === 'string' ? { text: input } : input ?? {};
  const text = String(parsed.text ?? '').trim();
  if (!text) {
    return { audioDataUri: '' };
  }

  const model = process.env.LITELLM_TTS_MODEL || 'kokoro';
  const rawVoice =
    (typeof input === 'object' && input && 'voice' in input && input.voice) ||
    process.env.LITELLM_TTS_VOICE ||
    null;
  const voice = getValidTtsVoice(rawVoice);

  const { audioBuffer, contentType } = await litellmTextToSpeech({
    text,
    model,
    voice,
  });

  if (audioBuffer.length === 0) {
    return { audioDataUri: '' };
  }

  const base64 = audioBuffer.toString('base64');
  const audioDataUri = `data:${contentType};base64,${base64}`;
  return { audioDataUri };
}
