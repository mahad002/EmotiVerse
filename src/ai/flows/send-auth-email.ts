'use server';

/**
 * @fileOverview A flow for sending authentication-related emails.
 *
 * - sendAuthEmail - A function that handles sending emails for auth events.
 * - SendAuthEmailInput - The input type for the sendAuthEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendAuthEmailInputSchema = z.object({
  email: z.string().email().describe('The email address of the recipient.'),
  type: z.enum(['signup', 'login']).describe('The type of authentication event.'),
  username: z.string().optional().describe('The username of the user, for signup emails.')
});
export type SendAuthEmailInput = z.infer<typeof SendAuthEmailInputSchema>;


export async function sendAuthEmail(input: SendAuthEmailInput): Promise<void> {
  await sendAuthEmailFlow(input);
}


const sendAuthEmailFlow = ai.defineFlow(
  {
    name: 'sendAuthEmailFlow',
    inputSchema: SendAuthEmailInputSchema,
    outputSchema: z.void(),
  },
  async ({ email, type, username }) => {
    // In a real application, you would integrate an email sending service
    // like SendGrid, Mailgun, or AWS SES here.
    // For this example, we will just log the email that would be sent.

    if (type === 'signup') {
      console.log(`
        To: ${email}
        Subject: Welcome to EmotiVerse!
        
        Hi ${username || 'there'},

        Thanks for signing up for EmotiVerse. We're excited to have you!

        Start chatting now and explore conversations with AI.

        Best,
        The EmotiVerse Team
      `);
    } else if (type === 'login') {
      console.log(`
        To: ${email}
        Subject: New Login to Your EmotiVerse Account
        
        Hi,

        We noticed a new login to your EmotiVerse account. If this was you, you can safely ignore this email.

        If you don't recognize this activity, please secure your account immediately.

        Best,
        The EmotiVerse Team
      `);
    }
  }
);
