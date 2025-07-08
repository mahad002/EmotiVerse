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
  response: z.array(z.string()).describe('The response from the AI, broken down into conversational chunks with fillers.'),
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

  IMPORTANT: Your response MUST be broken down into a series of short, natural-sounding sentences or phrases, as if you were speaking in a real conversation.
  Include conversational fillers like "Hmm...", "Well...", "You know...", "Right.", etc., to make it sound more human.
  Do not deliver the entire response in one go. Each part of the response should be a separate string in the output array.

  Your final output must be in the specified JSON format.

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
