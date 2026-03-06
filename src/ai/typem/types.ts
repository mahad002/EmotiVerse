/**
 * Shared types for the Type M writing and research agent.
 */

export type WritingIntentType = 'simple' | 'document' | 'research';

export interface WritingIntent {
  type: WritingIntentType;
  documentType?: string;
  tone?: string;
  audience?: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  description: string;
}

export interface DocumentPlan {
  title: string;
  sections: OutlineSection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  description: string;
  content: string;
}

export interface ReviewResult {
  passed: boolean;
  issues: string[];
  severity: 'error' | 'warning';
}

export interface AgentInput {
  message: string;
  history?: { sender: string; text: string }[];
  sessionId: string;
}

export type ProgressEvent =
  | { stage: 'classifying' }
  | { stage: 'outlining'; detail?: string }
  | { stage: 'outline_ready'; plan: DocumentPlan }
  | { stage: 'expanding'; sectionId: string; sectionIndex: number; totalSections: number }
  | { stage: 'reviewing'; sectionId: string }
  | { stage: 'fixing'; sectionId: string; attempt: number }
  | { stage: 'section_generated'; sections: DocumentSection[] }
  | { stage: 'complete' };

export type AgentOutputType = 'simple' | 'document';

export interface AgentOutput {
  type: AgentOutputType;
  response: string;
  /** Document path: full assembled text */
  fullDocument?: string;
  /** Document path: sections with content */
  sections?: DocumentSection[];
  /** Document path: plan (title + outline) */
  plan?: DocumentPlan;
}
