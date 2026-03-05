'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { playMessageNotificationSound } from '@/features/chat/lib/chat-types';
import type { Message } from '@/features/chat/lib/chat-types';

export interface UseChatAudioOptions {
  isVoiceEnabled: boolean;
  shouldPlayVoice: boolean;
  messages: Message[];
  isNotificationMuted: boolean;
}

export interface UseChatAudioReturn {
  audioQueue: string[];
  setAudioQueue: React.Dispatch<React.SetStateAction<string[]>>;
  isAudioPlaying: boolean;
  setIsAudioPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playingVoiceId: string | null;
  setPlayingVoiceId: React.Dispatch<React.SetStateAction<string | null>>;
  voicePlaybackProgress: number;
  voicePlaybackRef: React.RefObject<HTMLAudioElement | null>;
  handleVoicePlayPause: (msgId: string, audioDataUri: string, durationSec: number) => void;
  resetNotificationTracking: () => void;
}

export function useChatAudio({
  isVoiceEnabled,
  shouldPlayVoice,
  messages,
  isNotificationMuted,
}: UseChatAudioOptions): UseChatAudioReturn {
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicePlaybackRef = useRef<HTMLAudioElement | null>(null);
  const prevMessageCountRef = useRef(0);

  const resetNotificationTracking = useCallback(() => {
    prevMessageCountRef.current = 0;
  }, []);

  const handleVoicePlayPause = useCallback(
    (msgId: string, audioDataUri: string, durationSec: number) => {
      if (playingVoiceId === msgId) {
        voicePlaybackRef.current?.pause();
        voicePlaybackRef.current = null;
        setPlayingVoiceId(null);
        setVoicePlaybackProgress(0);
        return;
      }
      if (voicePlaybackRef.current) {
        voicePlaybackRef.current.pause();
        voicePlaybackRef.current = null;
      }
      const audio = new Audio(audioDataUri);
      voicePlaybackRef.current = audio;
      audio.onended = () => {
        setPlayingVoiceId(null);
        setVoicePlaybackProgress(0);
        voicePlaybackRef.current = null;
      };
      audio.ontimeupdate = () => {
        if (durationSec > 0) setVoicePlaybackProgress(audio.currentTime / durationSec);
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        setVoicePlaybackProgress(0);
        voicePlaybackRef.current = null;
      };
      audio.play().catch(() => {});
      setPlayingVoiceId(msgId);
    },
    [playingVoiceId]
  );

  useEffect(() => {
    if (!isVoiceEnabled && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
      setAudioQueue([]);
      setIsAudioPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [isVoiceEnabled]);

  useEffect(() => {
    if (isNotificationMuted) return;
    const len = messages.length;
    if (len === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    const last = messages[len - 1];
    if (last.sender !== 'ai') {
      prevMessageCountRef.current = len;
      return;
    }
    if (len > prevMessageCountRef.current) {
      playMessageNotificationSound();
    }
    prevMessageCountRef.current = len;
  }, [messages, isNotificationMuted]);

  useEffect(() => {
    if (!shouldPlayVoice || isAudioPlaying || audioQueue.length === 0) return;
    const nextAudioSrc = audioQueue[0];
    if (!nextAudioSrc || !nextAudioSrc.startsWith('data:audio/')) {
      setAudioQueue((prev) => prev.slice(1));
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    try {
      audioRef.current = new Audio(nextAudioSrc);
      audioRef.current.onended = () => {
        setIsAudioPlaying(false);
        setAudioQueue((prev) => prev.slice(1));
        if (audioRef.current) {
          audioRef.current.src = '';
          audioRef.current = null;
        }
      };
      audioRef.current.onerror = () => {
        setIsAudioPlaying(false);
        setAudioQueue((prev) => prev.slice(1));
        if (audioRef.current) {
          audioRef.current.src = '';
          audioRef.current = null;
        }
      };
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        let settled = false;
        const unblock = () => {
          if (settled) return;
          settled = true;
          setIsAudioPlaying(false);
          setAudioQueue((prev) => prev.slice(1));
          if (audioRef.current) {
            audioRef.current.src = '';
            audioRef.current = null;
          }
        };
        const timeout = setTimeout(unblock, 12000);
        playPromise
          .then(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            setIsAudioPlaying(true);
          })
          .catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            unblock();
          });
      }
    } catch {
      setIsAudioPlaying(false);
      setAudioQueue((prev) => prev.slice(1));
    }
  }, [audioQueue, isAudioPlaying, shouldPlayVoice]);

  return {
    audioQueue,
    setAudioQueue,
    isAudioPlaying,
    setIsAudioPlaying,
    audioRef,
    playingVoiceId,
    setPlayingVoiceId,
    voicePlaybackProgress,
    voicePlaybackRef,
    handleVoicePlayPause,
    resetNotificationTracking,
  };
}
