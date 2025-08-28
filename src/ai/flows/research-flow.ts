
'use server';

/**
 * @fileOverview A research AI agent that uses Exa to search the web.
 *
 * - research - A function that handles the research process.
 * - ResearchInput - The input type for the research function.
 * - ResearchOutput - The return type for the research function.
 */

import { ai } from '@/ai/genkit';
import { searchExa } from '@/services/exa';
import { z } from 'genkit';

const ResearchInputSchema = z.object({
  query: z.string().describe('The research query from the user.'),
});
export type ResearchInput = z.infer<typeof ResearchInputSchema>;

const ResearchOutputSchema = z.object({
  answer: z
    .string()
    .describe('The detailed, synthesized answer to the research query.'),
  references: z
    .array(
      z.object({
        title: z.string().describe('The title of the source.'),
        url: z.string().url().describe('The URL of the source.'),
      })
    )
    .describe('A list of sources used to generate the answer.'),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

export async function research(input: ResearchInput): Promise<ResearchOutput> {
  return researchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'researchPrompt',
  input: { schema: z.object({ query: z.string(), searchResults: z.any() }) },
  output: { schema: ResearchOutputSchema },
  prompt: `You are a highly intelligent research assistant. Your task is to analyze the provided search results and synthesize them into a comprehensive, well-structured answer to the user's query.

User Query: {{{query}}}

Search Results:
"
{{#each searchResults}}
[Title: {{{this.title}}}]
[URL: {{{this.url}}}]
[Content: {{{this.text}}}]
---
{{/each}}
"

Instructions:
1.  **Synthesize, do not copy:** Read through all the search results to get a deep understanding of the topic. Do not just copy-paste sections from the results. Create a new, original response in your own words that answers the user's query.
2.  **Cite your sources:** Your response MUST be backed by the information in the search results. At the end of your answer, you must provide a list of the URLs you used to formulate your response.
3.  **Format the output:** The final output must be a JSON object matching the specified Zod schema, containing the 'answer' and the 'references' array.
`,
});

const researchFlow = ai.defineFlow(
  {
    name: 'researchFlow',
    inputSchema: ResearchInputSchema,
    outputSchema: ResearchOutputSchema,
  },
  async ({ query }) => {
    // const searchResults = await searchExa(query);
    const searchResults: any[] = []; // Temporarily disabled

    if (searchResults.length === 0) {
      return {
        answer: "I am currently unable to perform web searches. Please try again later.",
        references: [],
      }
    }

    const llmResponse = await prompt({
      query,
      searchResults,
    });

    return llmResponse.output!;
  }
);
