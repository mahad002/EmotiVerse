/**
 * Chat domain types, constants, and pure helpers.
 * Used by client-page and chat feature components/hooks.
 */

export const MAHAD_CHARACTER_ID = 'character-1';
export const CODEM_CHARACTER_ID = 'character-3';
export const TYPEM_CHARACTER_ID = 'character-4';
export const IMAGE_GENERATING_PLACEHOLDER_ID = '__image_generating__';
export const NOTIFICATION_MUTED_STORAGE_KEY = 'emotiverse_notification_muted';

export const REACTION_OPTIONS = ['👍', '👎', '❤️', '😂', '🔥', '😮'] as const;

/** Code M only: parsed segment for prose vs code block. */
export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'code'; code: string; language?: string; filename?: string };

/** Code M agent: one generated file in a multi-file project output. */
export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

/**
 * Merge file lists by path: one entry per path, last occurrence wins.
 * Use when the agent may emit the same path multiple times (e.g. create then rework).
 */
export function mergeFilesByPath(
  existing: GeneratedFile[],
  incoming: GeneratedFile[]
): GeneratedFile[] {
  const byPath = new Map<string, GeneratedFile>();
  existing.forEach((f) => byPath.set(f.path, f));
  incoming.forEach((f) => byPath.set(f.path, f));
  return [...byPath.values()];
}

/** Code M agent: plan summary for display (tasks + architecture + setup). */
export interface AgentPlanSummary {
  tasks: string[];
  architecture: string;
  /** ASCII directory tree for layman setup. */
  directoryTree?: string;
  /** Ordered install/run commands (npm install, npm start, etc.). */
  setupCommands?: string[];
  /** All generated file paths — used to derive mkdir/touch commands in UI. */
  filePaths?: string[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean;
  /** Code M only: structured text + code segments; when present, render via segment UI. */
  segments?: MessageSegment[];
  /** Code M agent: multi-file project output; when present, render via CodeMProjectView. */
  projectFiles?: GeneratedFile[];
  /** Code M agent: plan summary for project messages. */
  agentPlan?: AgentPlanSummary;
  /** Type M agent: document plan (title + outline) for document messages. */
  documentPlan?: { title: string; sections: { id: string; title: string; description: string }[] };
  /** Type M agent: one or more document sections (when sent as separate messages). */
  documentSections?: { id: string; title: string; description: string; content: string }[];
  imageDataUri?: string;
  imageBase64?: string;
  reaction?: string;
  /** Voice message: audio data URI and duration in seconds */
  audioDataUri?: string;
  audioDurationSeconds?: number;
}

export interface ChatData {
  characterId: string;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
}

export function formatVoiceDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Static waveform bar heights for voice message (same for all for now) */
export const VOICE_WAVEFORM_BARS = [
  0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.75, 0.6, 0.9, 0.5, 0.7, 0.6, 0.85, 0.5, 0.65, 0.7, 0.8, 0.5, 0.6,
];

/** Play a short WhatsApp-like message notification sound (Web Audio API). */
export function playMessageNotificationSound(): void {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore if AudioContext not supported or blocked
  }
}
