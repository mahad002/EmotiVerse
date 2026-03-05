
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { defaultPersonas, type Persona } from '@/config/personas';
import { characters, defaultCharacter, type Character } from '@/config/characters';
import { type EmotionalConversationInput } from '@/ai/flows/emotional-conversation';
import {
  Loader2,
  Send,
  User,
  CheckCheck,
  Volume2,
  VolumeX,
  Mic,
  Play,
  Pause,
  MoreVertical,
  ChevronLeft,
  Plus,
  Smile,
  MessageSquare,
  Phone,
  Video,
  Users,
  Download,
  Settings,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Camera,
  Headphones,
  BarChart3,
  Calendar,
  StickyNote,
  MapPin,
  Sparkles,
  Expand,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileSettingsPage } from '@/components/profile-settings-page';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TTS_VOICE_STORAGE_KEY, getValidTtsVoice } from '@/config/tts-voices';
import { USER_MESSAGES } from '@/config/user-messages';

const MAHAD_CHARACTER_ID = 'character-1';
const IMAGE_GENERATING_PLACEHOLDER_ID = '__image_generating__';

const REACTION_OPTIONS = ['👍', '👎', '❤️', '😂', '🔥', '😮'];

function formatVoiceDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Static waveform bar heights for voice message (same for all for now) */
const VOICE_WAVEFORM_BARS = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.75, 0.6, 0.9, 0.5, 0.7, 0.6, 0.85, 0.5, 0.65, 0.7, 0.8, 0.5, 0.6];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean;
  imageDataUri?: string;
  imageBase64?: string;
  reaction?: string;
  /** Voice message: audio data URI and duration in seconds */
  audioDataUri?: string;
  audioDurationSeconds?: number;
}

interface ChatData {
  characterId: string;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
}

// Extend window type for SpeechRecognition (Web Speech API)
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

export default function ClientPage() {
  const { toast } = useToast();
  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPersonas[0].id
  );
  const [charactersList] = useState<Character[]>(characters);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  
  // Store messages separately for each chat
  const [chats, setChats] = useState<Record<string, ChatData>>(() => {
    const initialChats: Record<string, ChatData> = {};
    characters.forEach((char) => {
      initialChats[char.id] = {
        characterId: char.id,
        messages: [],
      };
    });
    return initialChats;
  });
  
  const [userInput, setUserInput] = useState<string>('');
  const messages = chats[selectedCharacterId]?.messages || [];

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<InstanceType<Window['SpeechRecognition']> | null>(null);

  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [profileSheetTab, setProfileSheetTab] = useState<'profile' | 'settings'>('profile');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isMobileChatView, setIsMobileChatView] = useState(false);

  // Mahad-only input mode: chat | voice | image
  const [inputMode, setInputMode] = useState<'chat' | 'voice' | 'image'>('chat');
  const [pendingImageDataUri, setPendingImageDataUri] = useState<string | null>(null);
  const [pendingImageCaption, setPendingImageCaption] = useState('');
  const [imageSubMode, setImageSubMode] = useState<'photo' | 'generate'>('photo');
  const [imageGenQuality, setImageGenQuality] = useState<'high' | 'fast'>('fast');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  /** True from sending a voice response until TTS is done (so "Recording" stays visible during TTS). */
  const [isWaitingForVoiceResponse, setIsWaitingForVoiceResponse] = useState(false);

  /** Image lightbox: src when open, null when closed */
  const [viewingImageSrc, setViewingImageSrc] = useState<string | null>(null);

  /** Pending voice message (Voice mode: record then send) */
  const [pendingVoiceDataUri, setPendingVoiceDataUri] = useState<string | null>(null);
  const [pendingVoiceDurationSeconds, setPendingVoiceDurationSeconds] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartTimeRef = useRef<number>(0);

  /** Which voice message is playing and progress 0–1 for playhead */
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState(0);
  const voicePlaybackRef = useRef<HTMLAudioElement | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const lastScrollTriggerRef = useRef({ count: 0, lastId: '' });
  /** STT transcript: use when sending so we don't rely on state (which can be stale) */
  const pendingSttTranscriptRef = useRef<string | null>(null);

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || (personas.length > 0 ? personas[0] : null);
  const selectedCharacter =
    selectedCharacterId ? charactersList.find((c) => c.id === selectedCharacterId) : null;

  useEffect(() => {
    if (selectedCharacterId && selectedCharacterId !== MAHAD_CHARACTER_ID) {
      setInputMode('chat');
    }
    setPendingImageDataUri(null);
    setPendingImageCaption('');
  }, [selectedCharacterId]);

  useEffect(() => {
    if (inputMode === 'image') {
      setPendingImageDataUri(null);
      setPendingImageCaption('');
    }
    if (inputMode !== 'voice') {
      setPendingVoiceDataUri(null);
      setPendingVoiceDurationSeconds(0);
    }
  }, [inputMode]);

  // Create a fresh SpeechRecognition instance (Chrome doesn't allow reusing after first run)
  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;  // Keep listening until user stops (longer window)
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      console.error('Speech recognition error');
      toast({
        title: 'Voice input',
        description: USER_MESSAGES.SPEECH_INPUT,
        variant: 'destructive',
      });
      setIsRecording(false);
    };
    recognition.onresult = (event: { results: Iterable<{ [0]: { transcript: string } }> }) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      if (transcript) {
        setUserInput(transcript);
        pendingSttTranscriptRef.current = transcript;
      }
    };
    return recognition;
  }, [toast]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech Recognition not supported in this browser.');
    }
  }, []);

  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(TTS_VOICE_STORAGE_KEY) : null;
      const voice = getValidTtsVoice(stored);
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Failed to generate speech');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.audioDataUri) {
        setAudioQueue((prev) => [...prev, data.audioDataUri]);
      }
    },
    onError: (error) => {
      console.error('TTS Error:', error);
    },
  });

  const conversationMutation = useMutation({
    mutationFn: async (input: EmotionalConversationInput) => {
      const response = await fetch('/api/emotional-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Failed to process conversation');
      }
      
      return response.json();
    },
    onMutate: async (variables) => {
      const aiMessageId = 'ai-streaming-' + Date.now();
      const newAiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        isStreaming: true,
      };
      setChats((prev) => ({
        ...prev,
        [variables.characterId]: {
          ...prev[variables.characterId],
          messages: [...(prev[variables.characterId]?.messages || []), newAiMessage],
        },
      }));
      return { aiMessageId };
    },
    onSuccess: async (data, variables, context) => {
      const aiMessageId = context?.aiMessageId;
      const characterId = variables.characterId;
      if (!aiMessageId || !data.response) return;

      const respondWithVoice = (variables as { respondWithVoice?: boolean }).respondWithVoice ?? isVoiceEnabled;

      // Remove streaming message
      setChats((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          messages: (prev[characterId]?.messages || []).filter((msg) => msg.id !== aiMessageId),
        },
      }));

      if (respondWithVoice && data.response.length > 0) {
        const fullText = data.response.join('');
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem(TTS_VOICE_STORAGE_KEY) : null;
        const ttsVoice = getValidTtsVoice(stored);
        try {
          const ttsRes = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fullText, voice: ttsVoice }),
          });
          if (!ttsRes.ok) throw new Error('TTS failed');
          const ttsData = await ttsRes.json();
          const audioDataUri = ttsData?.audioDataUri;
          if (!audioDataUri) throw new Error('No audio');
          const duration = await new Promise<number>((resolve, reject) => {
            const audio = new Audio(audioDataUri);
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => reject(new Error('Audio load failed'));
          });
          const newAiMessage: Message = {
            id: 'ai-' + Date.now() + '-voice',
            text: fullText,
            sender: 'ai',
            audioDataUri,
            audioDurationSeconds: Math.round(duration * 10) / 10,
          };
          setChats((prev) => ({
            ...prev,
            [characterId]: {
              ...prev[characterId],
              messages: [...(prev[characterId]?.messages || []), newAiMessage],
              lastMessage: fullText,
              lastMessageTime: new Date(),
            },
          }));
          setIsWaitingForVoiceResponse(false);
        } catch (err) {
          console.error('AI voice response failed:', err);
          const fallbackMsg: Message = {
            id: 'ai-' + Date.now(),
            text: fullText,
            sender: 'ai',
          };
          setChats((prev) => ({
            ...prev,
            [characterId]: {
              ...prev[characterId],
              messages: [...(prev[characterId]?.messages || []), fallbackMsg],
              lastMessage: fullText,
              lastMessageTime: new Date(),
            },
          }));
          setIsWaitingForVoiceResponse(false);
        }
        return;
      }

      if (respondWithVoice) setIsWaitingForVoiceResponse(false);
      const chunks = data.response;
      for (const chunk of chunks) {
        const typingDelay = 500 + chunk.length * 25 + Math.random() * 200;
        await new Promise((res) =>
          setTimeout(res, Math.min(typingDelay, 3000))
        );

        const newAiMessage: Message = {
          id: 'ai-' + Date.now() + '-' + Math.random(),
          text: chunk,
          sender: 'ai',
        };
        
        setChats((prev) => ({
          ...prev,
          [characterId]: {
            ...prev[characterId],
            messages: [...(prev[characterId]?.messages || []), newAiMessage],
            lastMessage: chunk,
            lastMessageTime: new Date(),
          },
        }));

        if (isVoiceEnabled) {
          ttsMutation.mutate(chunk);
        }
      }
    },
    onError: (_error, variables, context) => {
      setIsWaitingForVoiceResponse(false);
      toast({
        title: 'Something went wrong',
        description: USER_MESSAGES.CONVERSATION,
        variant: 'destructive',
      });
      if (context?.aiMessageId) {
        setChats((prev) => ({
          ...prev,
          [variables.characterId]: {
            ...prev[variables.characterId],
            messages: (prev[variables.characterId]?.messages || []).filter(
              (msg) => msg.id !== context.aiMessageId
            ),
          },
        }));
      }
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async (params: { prompt: string; quality: 'high' | 'fast' }) => {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: params.prompt, quality: params.quality }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate image');
      }
      return res.json() as Promise<{ imageUrl?: string; imageBase64?: string }>;
    },
    onMutate: () => {
      const characterId = selectedCharacterId;
      if (!characterId) return;
      const placeholder: Message = {
        id: IMAGE_GENERATING_PLACEHOLDER_ID,
        text: 'Generating image...',
        sender: 'ai',
        isStreaming: true,
      };
      setChats((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          messages: [...(prev[characterId]?.messages || []), placeholder],
          lastMessage: placeholder.text,
          lastMessageTime: new Date(),
        },
      }));
    },
    onSuccess: (data) => {
      const characterId = selectedCharacterId;
      if (!characterId) return;
      const imageDataUri = data.imageBase64
        ? `data:image/png;base64,${data.imageBase64}`
        : data.imageUrl || '';
      const newAiMessage: Message = {
        id: 'ai-img-' + Date.now(),
        text: "Here's what I made.",
        sender: 'ai',
        imageDataUri: imageDataUri || undefined,
      };
      setChats((prev) => {
        const list = (prev[characterId]?.messages || []).filter(
          (m) => m.id !== IMAGE_GENERATING_PLACEHOLDER_ID
        );
        return {
          ...prev,
          [characterId]: {
            ...prev[characterId],
            messages: [...list, newAiMessage],
            lastMessage: newAiMessage.text,
            lastMessageTime: new Date(),
          },
        };
      });
    },
    onError: () => {
      const characterId = selectedCharacterId;
      if (characterId) {
        setChats((prev) => ({
          ...prev,
          [characterId]: {
            ...prev[characterId],
            messages: (prev[characterId]?.messages || []).filter(
              (m) => m.id !== IMAGE_GENERATING_PLACEHOLDER_ID
            ),
          },
        }));
      }
      toast({
        title: 'Image',
        description: USER_MESSAGES.IMAGE_GENERATION,
        variant: 'destructive',
      });
    },
  });

  const setMessageReaction = (characterId: string, messageId: string, reaction: string) => {
    setChats((prev) => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        messages: (prev[characterId]?.messages || []).map((m) =>
          m.id === messageId ? { ...m, reaction } : m
        ),
      },
    }));
    setReactionPickerMessageId(null);
  };

  const handleVoicePlayPause = useCallback((msgId: string, audioDataUri: string, durationSec: number) => {
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
  }, [playingVoiceId]);

  const handleSendMessage = () => {
    const isMahad = selectedCharacterId === MAHAD_CHARACTER_ID;
    const isImageMode = isMahad && inputMode === 'image';

    if (pendingVoiceDataUri && selectedCharacterId) {
      const audioUri = pendingVoiceDataUri;
      const duration = pendingVoiceDurationSeconds;
      const newMsg: Message = {
        id: Date.now().toString() + '-voice',
        text: '',
        sender: 'user',
        audioDataUri: audioUri,
        audioDurationSeconds: duration,
      };
      setChats((prev) => ({
        ...prev,
        [selectedCharacterId]: {
          ...prev[selectedCharacterId],
          messages: [...(prev[selectedCharacterId]?.messages || []), newMsg],
          lastMessage: 'Voice message',
          lastMessageTime: new Date(),
        },
      }));
      setPendingVoiceDataUri(null);
      setPendingVoiceDurationSeconds(0);
      const base64 = audioUri.includes(',') ? audioUri.split(',')[1] : '';
      if (base64 && selectedCharacter && selectedPersona) {
        fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64, filename: 'audio.webm' }),
        })
          .then((res) => res.json())
          .then((data) => {
            const transcript = data?.text?.trim() || 'What did you say?';
            const history = (chats[selectedCharacterId]?.messages || [])
              .slice(-10)
              .map((m) => ({
                sender: m.sender === 'ai' ? selectedCharacter!.name : 'user',
                text: m.text || (m.audioDataUri ? '[Voice message]' : ''),
              })) as EmotionalConversationInput['history'];
            setIsWaitingForVoiceResponse(true);
            conversationMutation.mutate({
              message: transcript,
              persona: selectedPersona.systemPrompt,
              characterId: selectedCharacterId,
              history,
              respondWithVoice: true,
            } as EmotionalConversationInput & { respondWithVoice?: boolean });
          })
          .catch(() => {
            toast({ title: 'Voice message', description: USER_MESSAGES.TRANSCRIPTION, variant: 'destructive' });
          });
      }
      return;
    }

    if (isImageMode && userInput.trim()) {
      const prompt = userInput.trim();
      if (selectedCharacterId) {
        const newUserMessage: Message = {
          id: 'user-img-prompt-' + Date.now(),
          text: prompt,
          sender: 'user',
        };
        setChats((prev) => ({
          ...prev,
          [selectedCharacterId]: {
            ...prev[selectedCharacterId],
            messages: [...(prev[selectedCharacterId]?.messages || []), newUserMessage],
            lastMessage: prompt,
            lastMessageTime: new Date(),
          },
        }));
      }
      generateImageMutation.mutate({ prompt, quality: imageGenQuality });
      setUserInput('');
      return;
    }

    if (pendingImageDataUri) {
      const imageUri = pendingImageDataUri;
      const caption = pendingImageCaption.trim() || 'What do you see?';
      const currentChatMessages = chats[selectedCharacterId]?.messages || [];
      const newUserMessage: Message = {
        id: Date.now().toString() + '-user',
        text: caption,
        sender: 'user',
        imageDataUri: imageUri,
      };
      if (!selectedCharacter || !selectedPersona) return;
      const currentMessages = [...currentChatMessages, newUserMessage];
      const history = currentMessages
        .slice(-10)
        .map(({ sender, text }) => ({
          sender: sender === 'ai' ? selectedCharacter.name : 'user',
          text,
        })) as EmotionalConversationInput['history'];
      setChats((prev) => ({
        ...prev,
        [selectedCharacterId]: {
          ...prev[selectedCharacterId],
          messages: currentMessages,
          lastMessage: caption,
          lastMessageTime: new Date(),
        },
      }));
      setPendingImageDataUri(null);
      setPendingImageCaption('');
      const respondWithVoice = selectedCharacterId === MAHAD_CHARACTER_ID && inputMode === 'voice';
      if (respondWithVoice) setIsWaitingForVoiceResponse(true);
      conversationMutation.mutate({
        message: caption,
        persona: selectedPersona.systemPrompt,
        characterId: selectedCharacterId,
        history,
        imageDataUri: imageUri,
        respondWithVoice,
      } as EmotionalConversationInput & { respondWithVoice?: boolean });
      return;
    }

    // Use STT ref so speech transcript is sent even if React hasn't updated userInput yet
    const effectiveText = (pendingSttTranscriptRef.current ?? userInput).trim();
    if (pendingSttTranscriptRef.current) pendingSttTranscriptRef.current = null;
    if (!effectiveText && !pendingImageDataUri) return;

    const currentChatMessages = chats[selectedCharacterId]?.messages || [];
    if (currentChatMessages.some((msg) => msg.isStreaming)) {
      const newUserMessage: Message = {
        id: Date.now().toString() + '-user',
        text: effectiveText,
        sender: 'user',
      };
      setChats((prev) => ({
        ...prev,
        [selectedCharacterId]: {
          ...prev[selectedCharacterId],
          messages: [...(prev[selectedCharacterId]?.messages || []), newUserMessage],
          lastMessage: effectiveText,
          lastMessageTime: new Date(),
        },
      }));
      setUserInput('');
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString() + '-user',
      text: effectiveText,
      sender: 'user',
    };

    if (!selectedCharacter || !selectedPersona) return;

    const currentMessages = [...currentChatMessages, newUserMessage];
    const history = currentMessages
      .slice(-10)
      .map(({ sender, text }) => ({
        sender: sender === 'ai' ? selectedCharacter.name : 'user',
        text,
      })) as EmotionalConversationInput['history'];

    // Update messages for current chat
    setChats((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...prev[selectedCharacterId],
        messages: currentMessages,
        lastMessage: effectiveText,
        lastMessageTime: new Date(),
      },
    }));
    setUserInput('');

    const respondWithVoice = selectedCharacterId === MAHAD_CHARACTER_ID && inputMode === 'voice';
    if (respondWithVoice) setIsWaitingForVoiceResponse(true);
    conversationMutation.mutate({
      message: effectiveText,
      persona: selectedPersona.systemPrompt,
      characterId: selectedCharacterId,
      history,
      respondWithVoice,
    } as EmotionalConversationInput & { respondWithVoice?: boolean });
  };

  const handleToggleRecording = async () => {
    const isVoiceMode = selectedCharacterId === MAHAD_CHARACTER_ID && inputMode === 'voice';

    if (isRecording) {
      if (isVoiceMode && voiceRecorderRef.current && voiceStreamRef.current) {
        voiceRecorderRef.current.stop();
        voiceStreamRef.current.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    if (isVoiceMode) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceStreamRef.current = stream;
        voiceChunksRef.current = [];
        voiceStartTimeRef.current = Date.now();
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
        recorder.onstop = () => {
          const durationSec = (Date.now() - voiceStartTimeRef.current) / 1000;
          const blob = new Blob(voiceChunksRef.current, { type: mime });
          const reader = new FileReader();
          reader.onload = () => {
            setPendingVoiceDataUri(reader.result as string);
            setPendingVoiceDurationSeconds(Math.round(durationSec * 10) / 10);
          };
          reader.readAsDataURL(blob);
        };
        recorder.start();
        voiceRecorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        toast({ title: 'Microphone', description: USER_MESSAGES.MIC_ACCESS, variant: 'destructive' });
      }
      return;
    }

    if (!isSpeechSupported) return;
    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.start();
  };

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
    const shouldPlayVoice = isVoiceEnabled || (selectedCharacterId === MAHAD_CHARACTER_ID && inputMode === 'voice');
    if (shouldPlayVoice && !isAudioPlaying && audioQueue.length > 0) {
      const nextAudioSrc = audioQueue[0];
      
      // Validate audio data URI
      if (!nextAudioSrc || !nextAudioSrc.startsWith('data:audio/')) {
        console.warn('Invalid audio data URI, skipping:', nextAudioSrc);
        setAudioQueue((prev) => prev.slice(1));
        return;
      }

      // Clean up previous audio if exists
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      try {
      audioRef.current = new Audio(nextAudioSrc);

        // Set up event handlers before playing
        audioRef.current.onended = () => {
          setIsAudioPlaying(false);
          setAudioQueue((prev) => prev.slice(1));
          if (audioRef.current) {
            audioRef.current.src = '';
            audioRef.current = null;
          }
        };
        
        audioRef.current.onerror = (e) => {
          const error = audioRef.current?.error;
          console.error('Audio playback error:', {
            code: error?.code,
            message: error?.message,
            error: error,
            src: nextAudioSrc?.substring(0, 50) + '...'
          });
          setIsAudioPlaying(false);
          setAudioQueue((prev) => prev.slice(1));
          if (audioRef.current) {
            audioRef.current.src = '';
            audioRef.current = null;
          }
        };

        // Attempt to play (timeout unblocks queue if play() never resolves/rejects)
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
    }
  }, [audioQueue, isAudioPlaying, isVoiceEnabled, selectedCharacterId, inputMode]);

  useEffect(() => {
    const count = messages.length;
    const lastId = count > 0 ? messages[count - 1].id : '';
    const prev = lastScrollTriggerRef.current;
    const shouldScrollToBottom = count > prev.count || (count > 0 && lastId !== prev.lastId);
    lastScrollTriggerRef.current = { count, lastId };
    if (shouldScrollToBottom && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const maxHeight = 128;
      const newHeight = Math.min(textAreaRef.current.scrollHeight, maxHeight);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  }, [userInput]);

  // Handle window resize - on desktop always show both views
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, always show both views (mobile chat view state doesn't matter)
        // But we keep the state for when user resizes back to mobile
      } else {
        // On mobile, if we're in chat view but no character selected, go to list
        if (!selectedCharacterId && isMobileChatView) {
          setIsMobileChatView(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileChatView, selectedCharacterId]);

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioQueue([]);
    setIsAudioPlaying(false);
    // On mobile, navigate to chat view when selecting a character
    if (window.innerWidth < 768) {
      setIsMobileChatView(true);
    }
  };

  // Safety check - if no persona selected, show loading
  if (!selectedPersona) {
  return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  return (
    <div ref={mainContentRef} className="flex h-screen w-full bg-background" tabIndex={-1}>
      {/* Sidebar - WhatsApp style - Hidden on mobile */}
      <div className="hidden md:flex w-14 bg-[#e9edef] dark:bg-[#202c33] border-r border-border flex-col items-center py-3 gap-3 flex-shrink-0">
        {/* Logo/Avatar at top */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mb-2 cursor-pointer">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage 
            src="https://inspirovix.s3.us-east-2.amazonaws.com/Inspirovix+-+11.png" 
              alt="EmotiVerse Logo"
          />
            <AvatarFallback className="bg-white/20 text-white font-semibold">
              E
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Messages icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-[#d1d7db] text-[#1f2c34] hover:bg-[#c2c9cd] dark:bg-[#2a3942] dark:text-white dark:hover:bg-[#2a3942]/80 relative"
          aria-label="Messages"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        {/* Separator */}
        <div className="w-10 h-px bg-border dark:bg-border/50"></div>

        {/* Downloads icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground relative"
          aria-label="Downloads"
        >
          <Download className="h-5 w-5" />
        </Button>

        {/* Separator */}
        <div className="w-10 h-px bg-border dark:bg-border/50 mt-auto"></div>

        {/* Settings icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
          aria-label="Settings"
          onClick={() => {
            setProfileSheetTab('settings');
            setIsProfileSheetOpen(true);
          }}
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* User avatar at bottom - opens Profile & Settings page */}
        <button
          type="button"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Profile and settings"
          onClick={() => {
            setProfileSheetTab('profile');
            setIsProfileSheetOpen(true);
          }}
        >
          <Avatar className="h-12 w-12 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Chat List Sidebar - Hidden on mobile when in chat view */}
      <div className={cn(
        "w-full md:w-80 bg-[#ffffff] dark:bg-[#111b21] border-r border-border flex flex-col flex-shrink-0",
        isMobileChatView && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="bg-[#e9edef] dark:bg-[#202c33] px-4 py-4 flex items-center justify-between">
          <h2 className="text-[#111b21] dark:text-white text-xl font-semibold">Chats</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
              aria-label="New chat"
            >
              <Plus className="h-5 w-5" />
            </Button>
            {/* Settings button - visible on mobile, hidden on desktop (desktop uses sidebar) */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
              aria-label="Settings"
              onClick={() => {
                setProfileSheetTab('settings');
                setIsProfileSheetOpen(true);
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-9 w-9 text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
              aria-label="Menu"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {charactersList.map((character) => {
            const chat = chats[character.id];
            const lastMessage = chat?.lastMessage || 'No messages yet';
            const lastTime = chat?.lastMessageTime 
              ? new Date(chat.lastMessageTime).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })
              : '';
            
            return (
              <div
                key={character.id}
                onClick={() => handleCharacterSelect(character.id)}
                className={cn(
                  "px-4 py-3 cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] border-l-4 transition-colors",
                  selectedCharacterId === character.id 
                    ? "bg-[#e9edef] dark:bg-[#2a3942] border-primary" 
                    : "border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    {/* <AvatarImage 
                      src="https://inspirovix.s3.us-east-2.amazonaws.com/Inspirovix+-+11.png" 
                      alt={character.name}
                    /> */}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {character.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[#111b21] dark:text-white text-base font-medium truncate">
                        {character.name}
                      </h3>
                      {lastTime && (
                        <span className="text-[#667781] dark:text-muted-foreground text-xs flex-shrink-0 ml-2">
                          {lastTime}
                        </span>
                      )}
                    </div>
                    <p className="text-[#667781] dark:text-muted-foreground text-sm truncate">
                      {lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area - Hidden on mobile when in list view, only show if character selected */}
      {selectedCharacter && (
      <div className={cn(
        "flex-1 flex flex-col bg-[#ece5dd] dark:bg-[#0b141a] sm:bg-[#dedbd2] dark:sm:bg-[#0b141a]",
        !isMobileChatView && "hidden md:flex"
      )} style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23f0f0f0%22 fill-opacity=%220.4%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}>
      {/* Header - WhatsApp style */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md z-10 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile: Show back button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10"
            onClick={() => setIsMobileChatView(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-10 w-10 cursor-pointer border-2 border-white/20">
            <AvatarFallback className="bg-white/20 text-primary-foreground font-semibold">
              {selectedCharacter.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
            // Could open character/persona selector
          }}>
            <h2 className="text-base font-medium truncate text-primary-foreground">{selectedCharacter.name}</h2>
            <p className="text-xs opacity-90 truncate text-primary-foreground/80">
              {(conversationMutation.isPending && isVoiceEnabled) || isWaitingForVoiceResponse ? 'Recording…' : selectedCharacter.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVoiceEnabled((v) => !v)}
            className="h-10 w-10 text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10 rounded-full"
            aria-label={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
          >
            {isVoiceEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10 rounded-full"
                aria-label="Menu"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  setProfileSheetTab('settings');
                  setIsProfileSheetOpen(true);
                }}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  // Could add more options here
                }}
                className="cursor-pointer"
              >
                View contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Could add more options here
                }}
                className="cursor-pointer"
              >
                Search
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Could add more options here
                }}
                className="cursor-pointer"
              >
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  // Could add more options here
                }}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Settings Dropdown - Hidden by default, shown on menu click */}
      <div className="bg-white dark:bg-[#1f2c34] border-b border-gray-200 dark:border-[#2a3942] px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Tone:</label>
                <Select
                  value={selectedPersonaId}
                  onValueChange={(value) => {
                    setSelectedPersonaId(value);
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }
                    setAudioQueue([]);
                    setIsAudioPlaying(false);
                  }}
                >
                  <SelectTrigger
                    id="persona-select"
              className="h-8 text-xs bg-white dark:bg-[#2a3942] dark:text-white border border-gray-200 dark:border-[#3c4d57]"
                  >
              <SelectValue placeholder="Tone..." />
                  </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-white border border-gray-200 dark:border-[#3c4d57]">
                    {personas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

      {/* Messages Area - WhatsApp style */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="px-2 sm:px-4 py-4 space-y-1 min-h-full flex flex-col justify-end">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex-1 flex items-center justify-center">
                <p className="text-sm">Start a conversation with {selectedCharacter.name}</p>
          </div>
            )}
            {messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showAvatar = msg.sender === 'ai' && (prevMsg?.sender !== 'ai' || !prevMsg);
              const isConsecutive = prevMsg?.sender === msg.sender;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                  'flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                  msg.sender === 'user' ? 'justify-end' : 'justify-start',
                  isConsecutive && 'mt-0.5',
                  !isConsecutive && 'mt-2',
                  msg.reaction && 'pb-8'
                )}
              >
                {showAvatar ? (
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs dark:bg-[#1f2c34] dark:text-white">
                      {selectedCharacter.name.charAt(0)}
                    </AvatarFallback>
                    </Avatar>
                ) : (
                  <div className="h-7 w-7 flex-shrink-0" />
                  )}

                {/* Wrapper so reaction badge and trigger sit outside the message bubble */}
                <div className={cn(
                  'group relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] overflow-visible',
                  msg.sender === 'user' && 'ml-auto'
                )}>
                  <div
                    className={cn(
                      'relative rounded-lg px-2 py-1.5 text-[15px] break-words',
                      msg.sender === 'user'
                        ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none shadow-sm dark:bg-[#005c4b] dark:text-white'
                        : 'bg-white text-gray-900 rounded-tl-none shadow-sm dark:bg-[#1f2c34] dark:text-white'
                    )}
                  >
                    {msg.audioDataUri ? (
                      /* Voice message: play, waveform, duration, timestamp */
                      <div className="flex items-center gap-2 py-1 min-w-[200px]">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-[#3b4a54] dark:hover:bg-[#4a5a64] text-gray-700 dark:text-gray-200"
                          onClick={() => handleVoicePlayPause(msg.id, msg.audioDataUri!, msg.audioDurationSeconds ?? 0)}
                          aria-label={playingVoiceId === msg.id ? 'Pause' : 'Play'}
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="relative flex items-end gap-0.5 h-6">
                            {VOICE_WAVEFORM_BARS.map((h, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'w-1 rounded-full min-h-[4px] flex-1 max-w-[6px]',
                                  msg.sender === 'user'
                                    ? 'bg-[#005c4b]/50 dark:bg-white/50'
                                    : 'bg-gray-400 dark:bg-gray-500'
                                )}
                                style={{ height: `${h * 100}%` }}
                              />
                            ))}
                            {/* Playhead */}
                            {playingVoiceId === msg.id && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary rounded-full z-10 pointer-events-none"
                                style={{ left: `${Math.min(100, voicePlaybackProgress * 100)}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {formatVoiceDuration(msg.audioDurationSeconds ?? 0)}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 self-end">
                          {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    ) : (
                      <>
                        {(msg.imageDataUri || msg.imageBase64) && msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && (
                          <div className="mb-1.5 space-y-1.5">
                            <img
                              src={msg.imageDataUri || (msg.imageBase64 ? `data:image/png;base64,${msg.imageBase64}` : '')}
                              alt=""
                              className="max-w-full max-h-48 rounded object-contain"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                              onClick={() => {
                                const src = msg.imageDataUri || (msg.imageBase64 ? `data:image/png;base64,${msg.imageBase64}` : '');
                                if (!src) return;
                                const a = document.createElement('a');
                                a.href = src;
                                a.download = `emotiverse-image-${msg.id}.png`;
                                a.click();
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          </div>
                        )}
                        {msg.id === IMAGE_GENERATING_PLACEHOLDER_ID ? (
                          <div className="flex items-center gap-2 py-2 px-1">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-600 dark:text-gray-300">Generating image...</p>
                          </div>
                        ) : msg.isStreaming && msg.text.length === 0 ? (
                          <div className="flex items-center space-x-1.5 py-1">
                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed pb-0.5">{msg.text}</p>
                        )}
                        {msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && !msg.isStreaming && (
                          <div className={cn(
                            'flex items-center gap-1 mt-0.5 flex-wrap',
                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">
                              {new Date().toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                            {msg.sender === 'user' && (
                              <CheckCheck className="h-3 w-3 text-blue-500 flex-shrink-0 ml-0.5" />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Reaction badge: received = bottom-left; sent = bottom-right, 80% outside */}
                  {msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && msg.reaction && (
                    <div
                      className={cn(
                        'absolute bottom-0 translate-y-[80%] flex items-center justify-center min-w-[22px] h-5 px-1 rounded-full bg-gray-200/90 dark:bg-[#2a3942]/95 text-sm shadow-sm',
                        msg.sender === 'user' ? 'right-2 left-auto' : 'left-2'
                      )}
                      title="Reaction"
                    >
                      {msg.reaction}
                    </div>
                  )}

                  {/* Reaction trigger: received = right center outside; sent = left center outside */}
                  {msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && !msg.isStreaming && (
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 transition-opacity',
                        msg.sender === 'user'
                          ? 'left-0 -translate-x-full pr-0.5'
                          : 'right-0 translate-x-full pl-0.5',
                        reactionPickerMessageId === msg.id
                          ? 'opacity-100'
                          : 'opacity-70 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto'
                      )}
                    >
                      <Popover open={reactionPickerMessageId === msg.id} onOpenChange={(open) => !open && setReactionPickerMessageId(null)}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-[#3b4a54] dark:hover:bg-[#4a5a64]"
                            aria-label="React to message"
                            onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId((id) => (id === msg.id ? null : msg.id)); }}
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1.5" align={msg.sender === 'user' ? 'end' : 'start'} side="top">
                          <div className="flex gap-0.5">
                            {REACTION_OPTIONS.map((emoji) => (
                              <Button
                                key={emoji}
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-lg rounded-full hover:bg-gray-100 dark:hover:bg-[#3b4a54]"
                                onClick={() => selectedCharacterId && setMessageReaction(selectedCharacterId, msg.id, emoji)}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="relative h-7 w-7 flex-shrink-0">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#075e54] text-white text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    {msg.audioDataUri && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Mic className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                )}
                </div>
              );
            })}
            </div>
          </ScrollArea>
      </div>

      {/* Input Area - WhatsApp style */}
      <div className="bg-[#f0f0f0] dark:bg-[#111b21] px-4 py-4 flex-shrink-0 border-t border-gray-300 dark:border-[#2a3942]">
        {/* Mahad-only: Chat / Voice / Image mode selector */}
        {selectedCharacterId === MAHAD_CHARACTER_ID && (
          <div className="flex items-center gap-1 mb-2">
            <Button
              type="button"
              variant={inputMode === 'chat' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs rounded-full"
              onClick={() => setInputMode('chat')}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </Button>
            <Button
              type="button"
              variant={inputMode === 'voice' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs rounded-full"
              onClick={() => setInputMode('voice')}
            >
              <Mic className="h-3.5 w-3.5 mr-1.5" />
              Voice
            </Button>
            <Button
              type="button"
              variant={inputMode === 'image' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs rounded-full"
              onClick={() => setInputMode('image')}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              Image
            </Button>
          </div>
        )}
        {/* Image mode = generate only: quality selector */}
        {selectedCharacterId === MAHAD_CHARACTER_ID && inputMode === 'image' && (
          <div className="flex items-center gap-1 mb-2">
            <Select value={imageGenQuality} onValueChange={(v: 'high' | 'fast') => setImageGenQuality(v)}>
              <SelectTrigger className="h-7 w-24 text-xs rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="high">High quality</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Preview when user has picked an image (Send photo - available in Chat/Voice for both) */}
        {pendingImageDataUri && (inputMode === 'chat' || inputMode === 'voice') && (
          <div className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-white/80 dark:bg-[#2a3942]/80 border border-gray-200 dark:border-[#3b4a54]">
            <img
              src={pendingImageDataUri}
              alt="Uploaded"
              className="h-14 w-14 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-[#3b4a54]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111b21] dark:text-white">You have uploaded an image</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add a caption below (optional) and tap Send</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Remove image"
              onClick={() => { setPendingImageDataUri(null); setPendingImageCaption(''); }}
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        )}
        {/* Preview when user has recorded a voice message (Voice mode) */}
        {pendingVoiceDataUri && inputMode === 'voice' && (
          <div className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-white/80 dark:bg-[#2a3942]/80 border border-gray-200 dark:border-[#3b4a54]">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111b21] dark:text-white">Voice message recorded</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.floor(pendingVoiceDurationSeconds / 60)}:{(Math.floor(pendingVoiceDurationSeconds % 60)).toString().padStart(2, '0')} — Tap Send to send
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Delete recording"
              onClick={() => { setPendingVoiceDataUri(null); setPendingVoiceDurationSeconds(0); }}
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        )}
        <div className="flex items-center gap-1 bg-white dark:bg-[#2a3942] rounded-full px-2 py-2 text-[#111b21] dark:text-white relative">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={imageInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setPendingImageDataUri(reader.result as string);
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />
          <Popover open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-200 dark:hover:bg-[#3b4a54]"
                aria-label="Attach file"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="start"
              className="w-auto p-3 bg-white dark:bg-[#233138] border-gray-200 dark:border-[#3b4a54] shadow-xl"
            >
              {/* Mobile: Grid layout - 2 rows x 4 columns */}
              <div className="grid grid-cols-4 gap-3 md:hidden">
                {/* Row 1 */}
                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle photos
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#0086ff] flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Photos</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle camera
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Camera</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle location
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#25d366] flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Location</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle contact
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Contact</span>
                </button>

                {/* Row 2 */}
                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle document
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#0086ff] flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Document</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle poll
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#ff9800] flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Poll</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle event
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#e91e63] flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">Event</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3b4a54] transition-colors"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle AI images
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#0086ff] flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-[#111b21] dark:text-white font-medium">AI images</span>
                </button>
              </div>

              {/* Desktop: Vertical list layout */}
              <div className="hidden md:block w-56 p-1">
                {/* Document */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle document upload
                  }}
                >
                  <div className="p-1.5 rounded bg-[#9b51e0] bg-opacity-20">
                    <FileText className="h-4 w-4 text-[#9b51e0]" />
                  </div>
                  <span className="text-white text-sm font-normal">Document</span>
                </button>

                {/* Photos & videos */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle photos & videos
                  }}
                >
                  <div className="p-1.5 rounded bg-[#0086ff] bg-opacity-20">
                    <ImageIcon className="h-4 w-4 text-[#0086ff]" />
                  </div>
                  <span className="text-white text-sm font-normal">Photos & videos</span>
                </button>

                {/* Camera */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle camera
                  }}
                >
                  <div className="p-1.5 rounded bg-[#e91e63] bg-opacity-20">
                    <Camera className="h-4 w-4 text-[#e91e63]" />
                  </div>
                  <span className="text-white text-sm font-normal">Camera</span>
                </button>

                {/* Audio */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle audio
                  }}
                >
                  <div className="p-1.5 rounded bg-[#ff9800] bg-opacity-20">
                    <Headphones className="h-4 w-4 text-[#ff9800]" />
                  </div>
                  <span className="text-white text-sm font-normal">Audio</span>
                </button>

                {/* Contact */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle contact
                  }}
                >
                  <div className="p-1.5 rounded bg-[#00bcd4] bg-opacity-20">
                    <User className="h-4 w-4 text-[#00bcd4]" />
                  </div>
                  <span className="text-white text-sm font-normal">Contact</span>
                </button>

                {/* Poll */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle poll
                  }}
                >
                  <div className="p-1.5 rounded bg-[#ff9800] bg-opacity-20">
                    <BarChart3 className="h-4 w-4 text-[#ff9800]" />
                  </div>
                  <span className="text-white text-sm font-normal">Poll</span>
                </button>

                {/* Event */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle event
                  }}
                >
                  <div className="p-1.5 rounded bg-[#e91e63] bg-opacity-20">
                    <Calendar className="h-4 w-4 text-[#e91e63]" />
                  </div>
                  <span className="text-white text-sm font-normal">Event</span>
                </button>

                {/* New sticker */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle new sticker
                  }}
                >
                  <div className="p-1.5 rounded bg-[#25d366] bg-opacity-20">
                    <StickyNote className="h-4 w-4 text-[#25d366]" />
                  </div>
                  <span className="text-white text-sm font-normal">New sticker</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Emoji icon - same size as plus */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-200 dark:hover:bg-[#3b4a54]"
            aria-label="Emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          {/* Send photo: always in Chat/Voice for both characters */}
              {(inputMode === 'chat' || inputMode === 'voice') && selectedCharacterId && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Send photo"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              )}
              <Textarea
                ref={textAreaRef}
                value={pendingImageDataUri ? pendingImageCaption : userInput}
                onChange={(e) =>
                  pendingImageDataUri ? setPendingImageCaption(e.target.value) : setUserInput(e.target.value)
                }
                placeholder={
                  pendingImageDataUri
                    ? 'Add a caption (optional)'
                    : inputMode === 'image'
                      ? 'Describe the image to generate...'
                      : 'Type a message'
                }
            className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 max-h-24 text-[15px] text-[#111b21] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 min-h-[40px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
          
          {/* Mic (left) + Send (right when there's content); smooth transition */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              onClick={handleToggleRecording}
              disabled={conversationMutation.isPending || (inputMode !== 'voice' && !isSpeechSupported)}
              size="icon"
              variant="ghost"
              className={cn(
                'h-9 w-9 shrink-0 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-200 dark:hover:bg-[#3b4a54] transition-colors',
                isRecording && 'text-red-500 dark:text-red-400'
              )}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Mic
                className={cn('h-5 w-5', isRecording && 'animate-pulse')}
              />
            </Button>
            <div
              className={cn(
                'overflow-hidden transition-all duration-200 ease-out flex items-center justify-center',
                userInput.trim() || pendingImageDataUri || pendingVoiceDataUri
                  ? 'w-9 opacity-100'
                  : 'w-0 opacity-0 min-w-0 pointer-events-none'
              )}
            >
              <Button
                onClick={handleSendMessage}
                disabled={conversationMutation.isPending || generateImageMutation.isPending}
                size="icon"
                className="h-9 w-9 shrink-0 bg-primary hover:bg-[#064e45] dark:hover:bg-[#064e45] text-primary-foreground rounded-full transition-colors"
                aria-label="Send"
              >
                {conversationMutation.isPending || generateImageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
            </div>
          </div>
      </div>
      )}

    {/* Profile & Settings sheet (avatar = Profile tab, settings button = Settings tab) */}
    <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-md flex flex-col p-0"
        aria-describedby="profile-settings-description"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          mainContentRef.current?.focus();
        }}
      >
        <SheetHeader className="px-6 pt-6 pb-2 border-b border-border">
          <SheetTitle>Profile & Settings</SheetTitle>
          <SheetDescription id="profile-settings-description">
            View your profile and manage app settings.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <ProfileSettingsPage
            key={profileSheetTab}
            defaultTab={profileSheetTab}
            onAfterSignOut={() => setIsProfileSheetOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
    </div>
  );
}
