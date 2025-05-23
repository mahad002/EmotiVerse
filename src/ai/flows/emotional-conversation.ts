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
  message: z.string().describe('The message from the user.'),
  persona: z.string().describe('The emotional persona for the conversation.'),
});
export type EmotionalConversationInput = z.infer<typeof EmotionalConversationInputSchema>;

const EmotionalConversationOutputSchema = z.object({
  response: z.string().describe('The response from the AI incorporating the emotional persona.'),
});
export type EmotionalConversationOutput = z.infer<typeof EmotionalConversationOutputSchema>;

export async function emotionalConversation(input: EmotionalConversationInput): Promise<EmotionalConversationOutput> {
  return emotionalConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emotionalConversationPrompt',
  input: {schema: EmotionalConversationInputSchema},
  output: {schema: EmotionalConversationOutputSchema},
  prompt: `You are an AI assistant with the following emotional persona: {{{persona}}}.

  Respond to the following message from the user, incorporating the emotional persona into your response.

  Message: {{{message}}}`,
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
