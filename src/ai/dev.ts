import { config } from 'dotenv';
config();

import '@/ai/flows/generate-emotional-prompt.ts';
import '@/ai/flows/emotional-conversation.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/send-auth-email.ts';
import '@/ai/flows/research-flow.ts';
