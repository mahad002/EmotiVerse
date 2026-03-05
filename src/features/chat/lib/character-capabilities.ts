/**
 * Centralized behavior and UI flags per character (Sara, Mahad, Code M).
 * Replaces scattered selectedCharacterId === MAHAD_CHARACTER_ID / CODEM_CHARACTER_ID checks.
 */

import { CODEM_CHARACTER_ID, MAHAD_CHARACTER_ID } from './chat-types';

export interface CharacterCapabilities {
  /** Can use voice mode (record + TTS response). Mahad only. */
  supportsVoiceMode: boolean;
  /** Can use image mode (photo + caption or generate). Mahad only. */
  supportsImageMode: boolean;
  /** If set, use this persona and hide tone selector. Code M uses fixed technical persona. */
  fixedPersonaId: string | null;
  /** Terminal/Code M theme (emerald, monospace, dashboard). */
  useTerminalTheme: boolean;
  /** Show dashboard (e.g. HeroDashboard) above messages. Code M only. */
  showDashboardAboveMessages: boolean;
  /** Show the tone/persona selector. False for Code M. */
  showToneSelector: boolean;
  /** Status line when waiting for response (e.g. "Recording…" or "> generating..."). */
  statusLabelPending: string;
  /** Status line when idle. If null, use character description. */
  statusLabelReady: string | null;
  /** Messages area: justify-start (Code M) vs justify-end. */
  messagesAlignStart: boolean;
  /** Show "Start a conversation with X" when no messages. Code M hides this. */
  showEmptyStatePrompt: boolean;
  /** Reset input mode to chat when switching away from this character. */
  resetInputModeWhenLeaving: boolean;
}

const CODEM_CAPABILITIES: CharacterCapabilities = {
  supportsVoiceMode: false,
  supportsImageMode: false,
  fixedPersonaId: 'codem-technical-expert',
  useTerminalTheme: true,
  showDashboardAboveMessages: true,
  showToneSelector: false,
  statusLabelPending: '> generating...',
  statusLabelReady: '> Codestral-22B · Ready',
  messagesAlignStart: true,
  showEmptyStatePrompt: false,
  resetInputModeWhenLeaving: false,
};

const MAHAD_CAPABILITIES: CharacterCapabilities = {
  supportsVoiceMode: true,
  supportsImageMode: true,
  fixedPersonaId: null,
  useTerminalTheme: false,
  showDashboardAboveMessages: false,
  showToneSelector: true,
  statusLabelPending: 'Recording…',
  statusLabelReady: null,
  messagesAlignStart: false,
  showEmptyStatePrompt: true,
  resetInputModeWhenLeaving: true,
};

const SARA_DEFAULT_CAPABILITIES: CharacterCapabilities = {
  supportsVoiceMode: false,
  supportsImageMode: false,
  fixedPersonaId: null,
  useTerminalTheme: false,
  showDashboardAboveMessages: false,
  showToneSelector: true,
  statusLabelPending: 'Recording…',
  statusLabelReady: null,
  messagesAlignStart: false,
  showEmptyStatePrompt: true,
  resetInputModeWhenLeaving: false,
};

const CAPABILITIES_BY_ID: Record<string, CharacterCapabilities> = {
  [MAHAD_CHARACTER_ID]: MAHAD_CAPABILITIES,
  [CODEM_CHARACTER_ID]: CODEM_CAPABILITIES,
};

export function getCharacterCapabilities(characterId: string): CharacterCapabilities {
  return CAPABILITIES_BY_ID[characterId] ?? SARA_DEFAULT_CAPABILITIES;
}

export function isCodeM(characterId: string): boolean {
  return characterId === CODEM_CHARACTER_ID;
}

export function isMahad(characterId: string): boolean {
  return characterId === MAHAD_CHARACTER_ID;
}
