'use client';

import { useState, useCallback } from 'react';
import type { ChatData, Message } from '@/features/chat/lib/chat-types';

export interface UseChatSessionOptions {
  characterIds: string[];
}

export interface UseChatSessionReturn {
  chats: Record<string, ChatData>;
  setChats: React.Dispatch<React.SetStateAction<Record<string, ChatData>>>;
  getMessages: (characterId: string) => Message[];
  clearChat: (characterId: string) => void;
  setMessageReaction: (characterId: string, messageId: string, reaction: string) => void;
  /** Build history array for API from the last N messages. */
  buildHistory: (
    characterId: string,
    characterName: string,
    messages: Message[],
    maxItems?: number
  ) => { sender: string; text: string }[];
}

export function useChatSession({ characterIds }: UseChatSessionOptions): UseChatSessionReturn {
  const [chats, setChats] = useState<Record<string, ChatData>>(() => {
    const initial: Record<string, ChatData> = {};
    characterIds.forEach((id) => {
      initial[id] = { characterId: id, messages: [] };
    });
    return initial;
  });

  const getMessages = useCallback(
    (characterId: string): Message[] => {
      return chats[characterId]?.messages ?? [];
    },
    [chats]
  );

  const clearChat = useCallback((characterId: string) => {
    setChats((prev) => ({
      ...prev,
      [characterId]: {
        characterId,
        messages: [],
      },
    }));
  }, []);

  const setMessageReaction = useCallback(
    (characterId: string, messageId: string, reaction: string) => {
      setChats((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          characterId,
          messages: (prev[characterId]?.messages ?? []).map((m) =>
            m.id === messageId ? { ...m, reaction } : m
          ),
        },
      }));
    },
    []
  );

  const buildHistory = useCallback(
    (
      characterId: string,
      characterName: string,
      messages: Message[],
      maxItems = 10
    ): { sender: string; text: string }[] => {
      return messages.slice(-maxItems).map((m) => ({
        sender: m.sender === 'ai' ? characterName : 'user',
        text: m.text || (m.audioDataUri ? '[Voice message]' : ''),
      }));
    },
    []
  );

  return {
    chats,
    setChats,
    getMessages,
    clearChat,
    setMessageReaction,
    buildHistory,
  };
}
