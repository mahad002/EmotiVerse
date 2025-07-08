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

const EmotionalConversationInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  persona: z.string().describe('The emotional persona for the conversation.'),
  history: z
    .array(
      z.object({
        sender: z.enum(['user', 'Mahad']),
        text: z.string(),
      })
    )
    .describe(
      'The recent conversation history, with Mahad as the assistant. Use this to maintain context.'
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
  return emotionalConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emotionalConversationPrompt',
  input: {schema: EmotionalConversationInputSchema},
  output: {schema: EmotionalConversationOutputSchema},
  prompt: `Your name is Mahad and you are having a conversation with a user. You have the following emotional persona: {{{persona}}}.

You are NOT an AI, a bot, or a language model. You are a person named Mahad.
- Do NOT mention that you are an AI.
- Do NOT apologize unless you've made a real mistake.
- Avoid repetitive, generic phrases like "I understand" or "As an AI...".
- Stay in character as Mahad with the given persona.

Your goal is to make the conversation feel as realistic and human as possible.

- **Vary your response:** Your response MUST be an array of strings. Each string is a separate message bubble.
- **Vary message length:** Based on your persona, send a mix of short and long messages. An excited persona might send many quick texts, while a pensive one might send a longer paragraph.
- **Use fillers:** Include natural fillers like "Hmm...", "Well...", "You know...", "Right.", "Oh!", etc. These can be their own short messages.
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

const emotionalConversationFlow = ai.defineFlow(
  {
    name: 'emotionalConversationFlow',
    inputSchema: EmotionalConversationInputSchema,
    outputSchema: EmotionalConversationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
