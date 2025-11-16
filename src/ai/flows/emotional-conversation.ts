'use server';

/**
 * @fileOverview An emotional conversation AI agent.
 *
 * - emotionalConversation - A function that handles the emotional conversation process.
 * - EmotionalConversationInput - The input type for the emotionalConversation function.
 * - EmotionalConversationOutput - The return type for the emotionalConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateOpenAIResponse } from '@/ai/openai-handler';
import { characters, type Character } from '@/config/characters';

const EmotionalConversationInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  persona: z.string().describe('The emotional persona for the conversation.'),
  characterId: z.string().describe('The character ID (character-1 for Gemini, character-2 for OpenAI).'),
  history: z
    .array(
      z.object({
        sender: z.enum(['user', 'Mahad', 'Sara']),
        text: z.string(),
      })
    )
    .describe(
      'The recent conversation history. Use this to maintain context.'
    )
    .optional(),
});
export type EmotionalConversationInput = z.infer<
  typeof EmotionalConversationInputSchema
>;

const EmotionalConversationOutputSchema = z.object({
  response: z
    .array(z.string())
    .describe(
      'The response from the AI, broken down into conversational chunks with fillers.'
    ),
});
export type EmotionalConversationOutput = z.infer<
  typeof EmotionalConversationOutputSchema
>;

export async function emotionalConversation(
  input: EmotionalConversationInput
): Promise<EmotionalConversationOutput> {
  const character = characters.find((c) => c.id === input.characterId) || characters[0];
  
  // Route to OpenAI if character-2 is selected
  if (character.apiProvider === 'openai') {
    const characterName = character.name;
    
    // Normalize history sender names for OpenAI
    const normalizedHistory = input.history?.map((entry) => ({
      sender: entry.sender === 'Mahad' || entry.sender === 'Sara' 
        ? characterName 
        : entry.sender,
      text: entry.text,
    }));
    
    return await generateOpenAIResponse({
      message: input.message,
      persona: input.persona,
      characterName,
      history: normalizedHistory,
    });
  }
  
  // Default to Gemini (character-1)
  const characterName = character.name;
  
  // Normalize history sender names for Gemini too
  const normalizedHistory = input.history?.map((entry) => ({
    sender: entry.sender === 'Mahad' || entry.sender === 'Sara'
      ? characterName 
      : entry.sender,
    text: entry.text,
  }));
  
  const normalizedInput = {
    ...input,
    history: normalizedHistory,
  };
  
  return emotionalConversationFlow(normalizedInput, character);
}

const createPrompt = (characterName: string) => ai.definePrompt({
  name: `emotionalConversationPrompt-${characterName}`,
  input: {schema: EmotionalConversationInputSchema},
  output: {schema: EmotionalConversationOutputSchema},
  prompt: `Your name is ${characterName} and you are having a conversation with a user. You have the following emotional persona: {{{persona}}}.

You are NOT an AI, a bot, or a language model. You are a person named ${characterName}.
- Do NOT mention that you are an AI.
- Do NOT apologize unless you've made a real mistake.
- Avoid repetitive, generic phrases like "I understand" or "As an AI...".
- Stay in character as ${characterName} with the given persona.

Your goal is to make the conversation feel as realistic and human as possible.

- **Vary your response:** Your response MUST be an array of strings. Each string is a separate message bubble.
- **Vary message length:** Based on your persona, send a mix of short and long messages. An excited persona might send many quick texts, while a pensive one might send a longer paragraph.
- **Use fillers:** Include natural fillers like "Hmm...", "Well...", "You know...", "Right.", "Oh!", etc. These can be their own short messages.
- **Use natural language:** You can occasionally use very common, widely understood slang (e.g., 'cool', 'awesome', 'no worries') to make the conversation feel more casual. Use it sparingly and only when it fits the persona.
- **Use context:** Refer to the conversation history to stay on topic and remember what was said.

{{#if history}}
Here is the recent conversation history for context:
{{#each history}}
{{this.sender}}: {{{this.text}}}
{{/each}}
{{/if}}

Now, respond to the user's latest message:
User: {{{message}}}`,
});

const emotionalConversationFlow = async (
  input: EmotionalConversationInput,
  character: Character
) => {
  const prompt = createPrompt(character.name);
  const {output} = await prompt(input);
  return output!;
};
