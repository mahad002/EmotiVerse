'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: new () => {
      start(): void;
      stop(): void;
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: () => void;
      onend: () => void;
      onerror: (event: { error?: string }) => void;
      onresult: (event: { results: Iterable<{ [0]: { transcript: string } }> }) => void;
    };
    webkitSpeechRecognition: Window['SpeechRecognition'];
  }
}

export interface UseChatInputOptions {
  onTranscript?: (transcript: string) => void;
  onRecordingChange?: (recording: boolean) => void;
  onError?: () => void;
}

export interface UseChatInputReturn {
  isSpeechSupported: boolean;
  isRecording: boolean;
  setRecording: React.Dispatch<React.SetStateAction<boolean>>;
  recognitionRef: React.MutableRefObject<InstanceType<Window['SpeechRecognition']> | null>;
  pendingSttTranscriptRef: React.MutableRefObject<string | null>;
  createRecognition: () => InstanceType<Window['SpeechRecognition']> | null;
}

export function useChatInput(options: UseChatInputOptions = {}): UseChatInputReturn {
  const { onTranscript, onRecordingChange, onError } = options;
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<InstanceType<Window['SpeechRecognition']> | null>(null);
  const pendingSttTranscriptRef = useRef<string | null>(null);

  useEffect(() => {
    const Sr = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Sr) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
    }
  }, []);

  const createRecognition = useCallback(() => {
    const Sr = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Sr) return null;
    const recognition = new Sr();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsRecording(true);
      onRecordingChange?.(true);
    };
    recognition.onend = () => {
      setIsRecording(false);
      onRecordingChange?.(false);
    };
    recognition.onerror = () => {
      onError?.();
      setIsRecording(false);
      onRecordingChange?.(false);
    };
    recognition.onresult = (event: { results: Iterable<{ [0]: { transcript: string } }> }) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript) {
        pendingSttTranscriptRef.current = transcript;
        onTranscript?.(transcript);
      }
    };
    return recognition;
  }, [onTranscript, onRecordingChange, onError]);

  return {
    isSpeechSupported,
    isRecording,
    setRecording: setIsRecording,
    recognitionRef,
    pendingSttTranscriptRef,
    createRecognition,
  };
}
