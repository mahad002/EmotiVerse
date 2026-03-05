'use server';

// OpenAI - commented out; using LiteLLM for chat
// import OpenAI from 'openai';
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

import type { ChatMessage } from '@/ai/litellm-client';
import { litellmChatCompletion } from '@/ai/litellm-client';
import { refinePrompt } from '@/ai/flows/prompt-refiner';

export interface OpenAIConversationInput {
  message: string;
  persona: string;
  characterName: string;
  history?: Array<{ sender: string; text: string }>;
  imageDataUri?: string;
}

export interface OpenAIConversationOutput {
  response: string[];
}

/**
 * Generate a conversational response using LiteLLM (OpenAI-compatible API).
 */
export async function generateOpenAIResponse(
  input: OpenAIConversationInput
): Promise<OpenAIConversationOutput> {
  const systemPrompt = `Your name is ${input.characterName} and you are having a conversation with a user. You have the following emotional persona: ${input.persona}.

You are NOT an AI, a bot, or a language model. You are a person named ${input.characterName}.
- Do NOT mention that you are an AI.
- Do NOT apologize unless you've made a real mistake.
- Avoid repetitive, generic phrases like "I understand" or "As an AI...".
- Stay in character as ${input.characterName} with the given persona.

Your goal is to make the conversation feel as realistic and human as possible.

- **Vary your response:** Your response MUST be an array of strings. Each string is a separate message bubble.
- **Vary message length:** Based on your persona, send a mix of short and long messages. An excited persona might send many quick texts, while a pensive one might send a longer paragraph.
- **Use fillers:** Include natural fillers like "Hmm...", "Well...", "You know...", "Right.", "Oh!", etc. These can be their own short messages.
- **Use natural language:** You can occasionally use very common, widely understood slang (e.g., 'cool', 'awesome', 'no worries') to make the conversation feel more casual. Use it sparingly and only when it fits the persona.
- **Use context:** Refer to the conversation history to stay on topic and remember what was said.

Respond with a JSON object containing a "response" field that is an array of strings, where each string is a message bubble. Example: {"response": ["Hey there!", "How are you doing?"]}`;

  // Optional: refine prompt and compress context (agentic flow)
  let messageToUse = input.message;
  let compressedContext: string | undefined;
  const { refinedPrompt, compressedContext: ctx } = await refinePrompt({
    rawMessage: input.message,
    history: input.history,
    task: 'chat',
  });
  if (refinedPrompt) messageToUse = refinedPrompt;
  if (ctx) compressedContext = ctx;

  const systemContent = compressedContext
    ? `${systemPrompt}\n\nRecent context (keep it in mind): ${compressedContext}`
    : systemPrompt;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
  ];

  // Add conversation history
  if (input.history && input.history.length > 0) {
    for (const entry of input.history) {
      messages.push({
        role: (entry.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: entry.text,
      });
    }
  }

  // Add current message (text only or multimodal with image)
  if (input.imageDataUri) {
    const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      { type: 'image_url', image_url: { url: input.imageDataUri } },
    ];
    if (messageToUse.trim()) {
      parts.push({ type: 'text', text: messageToUse });
    } else {
      parts.push({ type: 'text', text: 'What do you see or notice in this image?' });
    }
    messages.push({ role: 'user', content: parts });
  } else {
    messages.push({ role: 'user', content: messageToUse });
  }

  const content = await litellmChatCompletion({
    messages,
    maxTokens: 1024,
    temperature: 0.7,
  });

  if (!content) {
    throw new Error('No response from LiteLLM');
  }

  try {
    const parsed = JSON.parse(content);
    // Handle both formats: { response: [...] } and just [...]
    let responseArray: string[] = [];
    
    if (Array.isArray(parsed)) {
      responseArray = parsed;
    } else if (parsed.response && Array.isArray(parsed.response)) {
      responseArray = parsed.response;
    } else if (parsed.text) {
      // If it's a single text response, split it into chunks
      responseArray = splitIntoChunks(parsed.text);
    } else if (typeof parsed === 'object') {
      // Fallback: try to find any array in the response
      const foundArray = Object.values(parsed).find(
        (v) => Array.isArray(v)
      ) as string[] | undefined;
      responseArray = foundArray || splitIntoChunks(content);
    } else {
      responseArray = splitIntoChunks(content);
    }

    // If still not an array, split the content into chunks
    if (!Array.isArray(responseArray) || responseArray.length === 0) {
      responseArray = splitIntoChunks(content);
    }

    return { response: responseArray };
  } catch (error) {
    // If JSON parsing fails, split the response into chunks
    return { response: splitIntoChunks(content) };
  }
}

/**
 * Split text into conversational chunks
 */
function splitIntoChunks(text: string): string[] {
  // Split by sentence endings, but keep natural break points
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Single word interjections or fillers go as separate chunks
    if (/^(Hmm|Well|Oh|Hey|Yeah|Right|Sure|Okay|Okay|Yep|Nope)[.,!]?$/i.test(trimmed)) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      chunks.push(trimmed);
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
      // If chunk is getting long, split it
      if (currentChunk.length > 150) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}
