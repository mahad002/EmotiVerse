'use server';

/**
 * Agentic prompt-refiner: improves user prompts and optionally compresses context
 * to reduce bloat before calling the main chat or image-generation model.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';

export type RefinerTask = 'chat' | 'image_gen';

export interface RefinerInput {
  rawMessage: string;
  history?: Array< { sender: string; text: string } >;
  task: RefinerTask;
}

export interface RefinerOutput {
  refinedPrompt: string;
  compressedContext?: string;
}

const REFINER_SYSTEM_CHAT = `You are a prompt refiner. Your job is to:
1. Take the user's message and sharpen it for a conversational AI - fix typos, clarify ambiguity, keep the same intent and tone. Output ONLY the refined message, nothing else.
2. If conversation history is provided, summarize it in 1-2 short sentences (compressed context) to reduce tokens. Put that summary on a second line starting with "CONTEXT: ".

Output format:
- Line 1: the refined user message only.
- If history was provided, line 2: "CONTEXT: " followed by 1-2 sentence summary.`;

const REFINER_SYSTEM_IMAGE = `You are an image prompt refiner. Take the user's description of an image they want generated and turn it into a clear, detailed prompt suitable for an image generation model (e.g. Flux). Preserve their intent. Add relevant style/detail only if it improves the image. Output ONLY the refined prompt, no other text.`;

function isRefinerEnabled(): boolean {
  return process.env.ENABLE_PROMPT_REFINER === 'true';
}

/**
 * Refine a raw user message (and optionally compress history) for chat or image_gen.
 * If ENABLE_PROMPT_REFINER is not true, returns the raw message unchanged with no compressed context.
 */
export async function refinePrompt(input: RefinerInput): Promise<RefinerOutput> {
  if (!isRefinerEnabled()) {
    return {
      refinedPrompt: input.rawMessage.trim(),
      compressedContext: undefined,
    };
  }

  const { rawMessage, history, task } = input;
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return { refinedPrompt: '', compressedContext: undefined };
  }

  const modelEnvKey = 'LITELLM_REFINER_MODEL';
  const defaultModel = 'mistral-7b-instruct';

  if (task === 'image_gen') {
    const content = await litellmChatCompletion(
      [
        { role: 'system', content: REFINER_SYSTEM_IMAGE },
        { role: 'user', content: trimmed },
      ],
      {
        modelEnvKey,
        defaultModel,
        maxTokens: 256,
        temperature: 0.3,
      }
    );
    return { refinedPrompt: content.trim(), compressedContext: undefined };
  }

  // chat
  let userContent = trimmed;
  if (history && history.length > 0) {
    const historyBlob = history
      .slice(-6)
      .map((h) => `${h.sender}: ${h.text}`)
      .join('\n');
    userContent = `Latest user message to refine:\n${trimmed}\n\nRecent conversation (summarize in 1-2 sentences if needed):\n${historyBlob}`;
  }

  const content = await litellmChatCompletion(
    [
      { role: 'system', content: REFINER_SYSTEM_CHAT },
      { role: 'user', content: userContent },
    ],
    {
      modelEnvKey,
      defaultModel,
      maxTokens: 512,
      temperature: 0.3,
    }
  );

  const lines = content.trim().split('\n');
  let refinedPrompt = lines[0] || trimmed;
  let compressedContext: string | undefined;
  const contextLine = lines.find((l) => l.startsWith('CONTEXT:'));
  if (contextLine) {
    compressedContext = contextLine.replace(/^CONTEXT:\s*/i, '').trim();
  }

  return { refinedPrompt, compressedContext };
}
