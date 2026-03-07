/**
 * Shared types for the Code M multi-model agent system.
 */

import type { MessageSegment } from '@/features/chat/lib/chat-types';

export interface IntentResult {
  type: 'simple' | 'project' | 'completion' | 'update';
  features: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface FileNode {
  path: string;
  description?: string;
}

export interface TaskDefinition {
  id: string;
  description: string;
  targetFiles: string[];
  dependsOn: string[];
  contextFiles: string[];
}

export interface ProjectArchitecture {
  projectType: string;
  structure: FileNode[];
  dependencies: string[];
  frameworks: string[];
}

export interface ProjectPlan {
  type: 'project';
  architecture: ProjectArchitecture;
  tasks: TaskDefinition[];
}

export interface SimplePlan {
  type: 'simple';
  description: string;
  singleFileHint?: { path: string; language: string };
}

export type Plan = SimplePlan | ProjectPlan;

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

/** Result of executeTask when caller needs to know if output was truncated (simple-plan only). */
export interface ExecuteTaskResult {
  files: GeneratedFile[];
  incomplete?: boolean;
}

/** One insertion point in a file skeleton (for long-file generation). */
export interface CheckpointSpec {
  id: string;
  insertAfter?: string;
  name?: string;
  purpose?: string;
  signature?: string;
}

/** Skeleton + checkpoints for segment-by-segment generation (simple long-file only). */
export interface SkeletonResult {
  filePath: string;
  language: string;
  checkpoints: CheckpointSpec[];
  skeletonText: string;
}

export interface ValidationResult {
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
  | { stage: 'planning'; detail: string }
  | { stage: 'plan_ready'; plan: ProjectPlan }
  | { stage: 'executing'; taskId: string; taskIndex: number; totalTasks: number }
  | { stage: 'validating'; taskId: string }
  | { stage: 'fixing'; taskId: string; attempt: number }
  | { stage: 'file_generated'; files: GeneratedFile[] }
  | { stage: 'complete' };

export interface AgentOutput {
  type: 'simple' | 'project';
  response: string;
  files?: GeneratedFile[];
  segments?: MessageSegment[];
  plan?: ProjectPlan;
  /** Project only: ASCII directory tree for layman setup. */
  directoryTree?: string;
  /** Project only: ordered commands to run (install, start, etc.). */
  setupCommands?: string[];
}

export interface AgentPlanSummary {
  tasks: string[];
  architecture: string;
}
