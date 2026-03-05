'use server';

/**
 * Image generation flow: refines the prompt then calls LiteLLM images/generations (flux).
 */

import { refinePrompt } from '@/ai/flows/prompt-refiner';
import { litellmImageGeneration } from '@/ai/litellm-client';

export type ImageQuality = 'high' | 'fast';

const MODEL_BY_QUALITY: Record<ImageQuality, string> = {
  high: 'flux.1-dev',
  fast: 'flux.1-schnell',
};

export interface GenerateImageInput {
  prompt: string;
  quality?: ImageQuality;
}

export interface GenerateImageOutput {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  const { prompt, quality = 'fast' } = input;
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error('Prompt is required for image generation');
  }

  const { refinedPrompt } = await refinePrompt({
    rawMessage: trimmed,
    task: 'image_gen',
  });
  const promptToUse = refinedPrompt || trimmed;

  const model = MODEL_BY_QUALITY[quality];
  const result = await litellmImageGeneration({
    prompt: promptToUse,
    model,
    size: '1024x1024',
    response_format: 'b64_json',
    n: 1,
  });

  return {
    imageUrl: result.imageUrl,
    imageBase64: result.imageBase64,
    mimeType: result.imageBase64 ? 'image/png' : undefined,
  };
}
