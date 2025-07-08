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

Your goal is to make the conversation feel as realistic as possible.

- **Break down your response:** Your response MUST be an array of strings. Each string represents a message bubble in a chat.
- **Vary your message length:** Based on the persona, decide whether to send several short messages (for a more interactive, conversational feel) or fewer, longer messages (for more thoughtful or detailed points). For example, an excited persona might send many quick messages, while a pensive one might send a longer paragraph.
- **Use conversational fillers:** Include fillers like "Hmm...", "Well...", "You know...", "Right.", "Oh!", etc., to make your responses sound more human. These can be their own short messages.
- **Simulate pauses:** The array structure naturally creates pauses. Use this to your advantage to control the rhythm of the conversation.

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
