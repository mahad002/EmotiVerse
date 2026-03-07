
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { codeMPersona, typeMPersona, defaultPersonas, type Persona } from '@/config/personas';
import { characters, defaultCharacter, type Character } from '@/config/characters';
import { type EmotionalConversationInput } from '@/ai/flows/emotional-conversation';
import {
  Loader2,
  Send,
  User,
  CheckCheck,
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
  Bell,
  BellOff,
  Search as SearchIcon,
  X,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
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
import { TTS_VOICE_STORAGE_KEY, getValidTtsVoice } from '@/config/tts-voices';
import { USER_MESSAGES } from '@/config/user-messages';
import HeroDashboard from '@/components/codem-dashboard';
import TypeMDashboard from '@/components/typem-dashboard';
import { ChatSearchBar } from '@/features/chat/components/search-bar';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatHeader } from '@/features/chat/components/chat-header';
import { ChatOverlays } from '@/features/chat/components/overlays';
import { CodeMCodeBlock } from '@/features/chat/components/codem-code-block';
import { CodeMProjectView } from '@/features/chat/components/codem-project-view';
import { CodeMProjectTodo } from '@/features/chat/components/codem-project-todo';
import { CodeMProgress, type CodeMPipelineStage } from '@/features/chat/components/codem-progress';
import { TypeMProgress, type TypeMPipelineStage } from '@/features/chat/components/typem-progress';
import { TypeMOutlineTodo } from '@/features/chat/components/typem-outline-todo';
import { TypeMPaperView } from '@/features/chat/components/typem-paper-view';
import { TypeMSectionBlock } from '@/features/chat/components/typem-section-block';
import { TypeMDocumentView } from '@/features/chat/components/typem-document-view';
import type { ProjectPlan } from '@/ai/codem/types';
import type { DocumentPlan as TypeMDocumentPlan, DocumentSection as TypeMDocumentSection } from '@/ai/typem/types';
import { useChatSession } from '@/features/chat/hooks/use-chat-session';
import { useChatAudio } from '@/features/chat/hooks/use-chat-audio';
import { useChatInput } from '@/features/chat/hooks/use-chat-input';
import {
  getCharacterCapabilities,
  isMahad,
  isCodeM,
  isTypeM,
} from '@/features/chat/lib/character-capabilities';
import {
  IMAGE_GENERATING_PLACEHOLDER_ID,
  NOTIFICATION_MUTED_STORAGE_KEY,
  REACTION_OPTIONS,
  VOICE_WAVEFORM_BARS,
  formatVoiceDuration,
  mergeFilesByPath,
  type ChatData,
  type Message,
  type GeneratedFile,
} from '@/features/chat/lib/chat-types';
import { parseCodeMResponse } from '@/features/chat/lib/parse-codem-response';

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Chat composition shell: selects character/persona/capabilities, wires feature hooks
 * (useChatSession, useChatAudio, useChatInput), and composes ChatSidebar, ChatHeader,
 * ChatSearchBar, ChatOverlays plus inline thread and composer.
 */
export default function ClientPage() {
  const { toast } = useToast();
  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPersonas[0].id
  );
  const [charactersList] = useState<Character[]>(characters);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    () => characters[0]?.id ?? ''
  );
  const { chats, setChats, getMessages, clearChat, setMessageReaction, buildHistory } = useChatSession({
    characterIds: charactersList.map((c) => c.id),
  });
  const [userInput, setUserInput] = useState<string>('');
  const messages = getMessages(selectedCharacterId);

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
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
  /** One session id per character for emotional chat (stable until reload). */
  const emotionalSessionIdsRef = useRef<Record<string, string>>({});
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  /** True from sending a voice response until TTS is done (so "Recording" stays visible during TTS). */
  const [isWaitingForVoiceResponse, setIsWaitingForVoiceResponse] = useState(false);

  /** Image lightbox: src when open, null when closed */
  const [viewingImageSrc, setViewingImageSrc] = useState<string | null>(null);

  /** Search in current chat */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /** Mute message notification sound (persisted) */
  const [isNotificationMuted, setIsNotificationMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(NOTIFICATION_MUTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  /** View contact (current character) dialog */
  const [isViewContactOpen, setIsViewContactOpen] = useState(false);

  const searchQ = searchQuery.trim().toLowerCase();
  const displayMessages = searchQ
    ? messages.filter((m) => (m.text || '').toLowerCase().includes(searchQ))
    : messages;

  /** Pending voice message (Voice mode: record then send) */
  const [pendingVoiceDataUri, setPendingVoiceDataUri] = useState<string | null>(null);
  const [pendingVoiceDurationSeconds, setPendingVoiceDurationSeconds] = useState(0);
  const [codeMPipelineStage, setCodeMPipelineStage] = useState<CodeMPipelineStage>(null);
  const [codeMPipelineDetail, setCodeMPipelineDetail] = useState<string | undefined>();
  const [codeMPipelineTaskIndex, setCodeMPipelineTaskIndex] = useState<number | undefined>();
  const [codeMPipelineTotalTasks, setCodeMPipelineTotalTasks] = useState<number | undefined>();
  const [codeMPipelineAttempt, setCodeMPipelineAttempt] = useState<number | undefined>();
  const [codeMProjectPlan, setCodeMProjectPlan] = useState<ProjectPlan | null>(null);
  const [codeMAccumulatedFiles, setCodeMAccumulatedFiles] = useState<GeneratedFile[]>([]);
  const codeMAccumulatedFilesRef = useRef<GeneratedFile[]>([]);
  const [typeMPipelineStage, setTypeMPipelineStage] = useState<TypeMPipelineStage>(null);
  const [typeMPipelineDetail, setTypeMPipelineDetail] = useState<string | undefined>();
  const [typeMPipelineSectionIndex, setTypeMPipelineSectionIndex] = useState<number | undefined>();
  const [typeMPipelineTotalSections, setTypeMPipelineTotalSections] = useState<number | undefined>();
  const [typeMPipelineAttempt, setTypeMPipelineAttempt] = useState<number | undefined>();
  const [typeMDocumentPlan, setTypeMDocumentPlan] = useState<TypeMDocumentPlan | null>(null);
  const [typeMAccumulatedSections, setTypeMAccumulatedSections] = useState<TypeMDocumentSection[]>([]);
  const typeMAccumulatedSectionsRef = useRef<TypeMDocumentSection[]>([]);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartTimeRef = useRef<number>(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const lastScrollTriggerRef = useRef({ count: 0, lastId: '' });

  const capabilities = selectedCharacterId ? getCharacterCapabilities(selectedCharacterId) : null;
  const shouldPlayVoice = isVoiceEnabled || (capabilities?.supportsVoiceMode && inputMode === 'voice');
  const {
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
  } = useChatAudio({
    isVoiceEnabled,
    shouldPlayVoice: !!shouldPlayVoice,
    messages,
    isNotificationMuted,
  });

  const { isSpeechSupported, isRecording, setRecording, recognitionRef, pendingSttTranscriptRef, createRecognition } = useChatInput({
    onTranscript: (t) => setUserInput(t),
    onError: () => {
      toast({ title: 'Voice input', description: USER_MESSAGES.SPEECH_INPUT, variant: 'destructive' });
    },
  });

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || (personas.length > 0 ? personas[0] : null);
  const selectedCharacter: Character | null =
    selectedCharacterId ? (charactersList.find((c) => c.id === selectedCharacterId) ?? null) : null;
  const isCodeMSelected = selectedCharacterId ? isCodeM(selectedCharacterId) : false;
  const isTypeMSelected = selectedCharacterId ? isTypeM(selectedCharacterId) : false;
  const activePersona = isCodeMSelected ? codeMPersona : isTypeMSelected ? typeMPersona : selectedPersona;

  useEffect(() => {
    if (selectedCharacterId && !capabilities?.resetInputModeWhenLeaving) {
      setInputMode('chat');
    }
    setPendingImageDataUri(null);
    setPendingImageCaption('');
  }, [selectedCharacterId, capabilities?.resetInputModeWhenLeaving]);

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
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/emotional-conversation', {
        method: 'POST',
        headers,
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

      // Code M: buffer full response, parse into text + code segments, add one message
      if (isCodeM(characterId) && data.response.length > 0) {
        const fullText = data.response.join('');
        const segments = parseCodeMResponse(fullText);
        const newAiMessage: Message = {
          id: 'ai-' + Date.now(),
          text: fullText,
          sender: 'ai',
          segments,
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
        return;
      }

      // Sara / Mahad: one bubble per chunk with typing delay
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

  type CodeMAgentInput = {
    characterId: string;
    message: string;
    history: { sender: string; text: string }[];
    sessionId: string;
  };

  const codeMAgentMutation = useMutation({
    mutationFn: async (input: CodeMAgentInput): Promise<{ output: import('@/ai/codem/types').AgentOutput; characterId: string }> => {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/codem-agent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: input.message,
          history: input.history,
          sessionId: input.sessionId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Code M agent failed');
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: import('@/ai/codem/types').AgentOutput | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as
                  | { stage?: string; detail?: string; taskId?: string; taskIndex?: number; totalTasks?: number; attempt?: number; plan?: ProjectPlan; files?: GeneratedFile[] }
                  | { type: 'result'; output: import('@/ai/codem/types').AgentOutput };
                if ('type' in data && data.type === 'result') {
                  result = data.output;
                } else if ('stage' in data && data.stage) {
                  setCodeMPipelineStage(data.stage as CodeMPipelineStage);
                  setCodeMPipelineDetail(data.detail);
                  setCodeMPipelineTaskIndex(data.taskIndex);
                  setCodeMPipelineTotalTasks(data.totalTasks);
                  setCodeMPipelineAttempt(data.attempt);
                  if (data.stage === 'plan_ready' && data.plan) {
                    setCodeMProjectPlan(data.plan);
                  }
                  if (data.stage === 'file_generated' && Array.isArray(data.files) && data.files.length > 0) {
                    const merged = mergeFilesByPath(codeMAccumulatedFilesRef.current, data.files);
                    codeMAccumulatedFilesRef.current = merged;
                    setCodeMAccumulatedFiles(merged);
                  }
                }
              } catch {
                // skip malformed SSE
              }
            }
          }
        }
      }

      if (!result) throw new Error('No result from Code M agent');
      return { output: result, characterId: input.characterId };
    },
    onMutate: async (variables) => {
      const aiMessageId = 'ai-streaming-' + Date.now();
      setCodeMPipelineStage('classifying');
      setCodeMPipelineDetail(undefined);
      setCodeMPipelineTaskIndex(undefined);
      setCodeMPipelineTotalTasks(undefined);
      setCodeMPipelineAttempt(undefined);
      setCodeMProjectPlan(null);
      codeMAccumulatedFilesRef.current = [];
      setCodeMAccumulatedFiles([]);
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
    onSuccess: (data, variables, context) => {
      const aiMessageId = context?.aiMessageId;
      const characterId = data.characterId;
      const { output } = data;
      setCodeMPipelineStage(null);
      setCodeMPipelineDetail(undefined);
      setCodeMProjectPlan(null);

      const newAiMessage: Message = {
        id: 'ai-' + Date.now(),
        text: output.response,
        sender: 'ai',
      };
      const messagesToAdd: Message[] = [];
      if (output.type === 'project') {
        const fromServer = output.files ?? [];
        const accumulated = codeMAccumulatedFilesRef.current ?? [];
        const serverHasContent = fromServer.some((f) => (f.content?.trim?.() ?? '').length > 0);
        const raw = (fromServer.length > 0 && serverHasContent)
          ? fromServer
          : (accumulated.length > 0 ? accumulated : fromServer);
        // One entry per path, last occurrence wins (reworked file updates the earlier one)
        const projectFiles = mergeFilesByPath([], raw);
        const agentPlan = output.plan
          ? {
              tasks: output.plan.tasks.map((t) => t.description),
              architecture: `${output.plan.architecture.projectType}: ${output.plan.architecture.structure.map((n) => n.path).join(', ')}`,
              directoryTree: output.directoryTree,
              setupCommands: output.setupCommands,
              filePaths: projectFiles.map((f) => f.path),
            }
          : undefined;
        // Plan/summary message (shows architecture + directory tree + setup commands + "Generated the following files")
        if (agentPlan || projectFiles.length === 0) {
          messagesToAdd.push({
            id: 'ai-' + Date.now() + '-plan',
            text: projectFiles.length > 0 ? 'Generated the following files:' : output.response || 'Generated the following files:',
            sender: 'ai',
            agentPlan: agentPlan ?? undefined,
            projectFiles: [],
          });
        }
        // One message per file (each with a single code segment so it can be downloaded)
        projectFiles.forEach((file, idx) => {
          messagesToAdd.push({
            id: 'ai-' + Date.now() + '-file-' + idx,
            text: '',
            sender: 'ai',
            segments: [
              { type: 'code', code: file.content, language: file.language, filename: file.path },
            ],
          });
        });
        // If no plan and no files, keep a single fallback message
        if (messagesToAdd.length === 0) {
          newAiMessage.text = output.response;
          newAiMessage.agentPlan = undefined;
          messagesToAdd.push(newAiMessage);
        }
      } else if (output.segments?.length) {
        newAiMessage.segments = output.segments;
        messagesToAdd.push(newAiMessage);
      } else {
        newAiMessage.text = output.response;
        messagesToAdd.push(newAiMessage);
      }

      setChats((prev) => {
        const base = prev[characterId]?.messages ?? [];
        const withoutStreaming = base.filter((msg) => msg.id !== aiMessageId);
        return {
          ...prev,
          [characterId]: {
            ...prev[characterId],
            messages: [...withoutStreaming, ...messagesToAdd],
            lastMessage: output.response,
            lastMessageTime: new Date(),
          },
        };
      });
      codeMAccumulatedFilesRef.current = [];
      setCodeMAccumulatedFiles([]);
    },
    onError: (_error, variables, context) => {
      setCodeMPipelineStage(null);
      setCodeMProjectPlan(null);
      setCodeMAccumulatedFiles([]);
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

  type TypeMAgentInput = {
    characterId: string;
    message: string;
    history: { sender: string; text: string }[];
    sessionId: string;
  };

  const typeMAgentMutation = useMutation({
    mutationFn: async (input: TypeMAgentInput): Promise<{ output: import('@/ai/typem/types').AgentOutput; characterId: string }> => {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/typem-agent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: input.message,
          history: input.history,
          sessionId: input.sessionId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Type M agent failed');
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: import('@/ai/typem/types').AgentOutput | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as
                  | { stage?: string; detail?: string; sectionId?: string; sectionIndex?: number; totalSections?: number; attempt?: number; plan?: TypeMDocumentPlan; sections?: TypeMDocumentSection[] }
                  | { type: 'result'; output: import('@/ai/typem/types').AgentOutput };
                if ('type' in data && data.type === 'result') {
                  result = data.output;
                } else if ('stage' in data && data.stage) {
                  setTypeMPipelineStage(data.stage as TypeMPipelineStage);
                  setTypeMPipelineDetail(data.detail);
                  setTypeMPipelineSectionIndex(data.sectionIndex);
                  setTypeMPipelineTotalSections(data.totalSections);
                  setTypeMPipelineAttempt(data.attempt);
                  if (data.stage === 'outline_ready' && data.plan) {
                    setTypeMDocumentPlan(data.plan);
                  }
                  if (data.stage === 'section_generated' && Array.isArray(data.sections) && data.sections.length > 0) {
                    const prev = typeMAccumulatedSectionsRef.current;
                    const merged = [...prev];
                    for (const s of data.sections) {
                      const idx = merged.findIndex((m) => m.id === s.id);
                      if (idx >= 0) merged[idx] = s;
                      else merged.push(s);
                    }
                    typeMAccumulatedSectionsRef.current = merged;
                    setTypeMAccumulatedSections(merged);
                  }
                }
              } catch {
                // skip malformed SSE
              }
            }
          }
        }
      }

      if (!result) throw new Error('No result from Type M agent');
      return { output: result, characterId: input.characterId };
    },
    onMutate: async (variables) => {
      const aiMessageId = 'ai-streaming-' + Date.now();
      setTypeMPipelineStage('classifying');
      setTypeMPipelineDetail(undefined);
      setTypeMPipelineSectionIndex(undefined);
      setTypeMPipelineTotalSections(undefined);
      setTypeMPipelineAttempt(undefined);
      setTypeMDocumentPlan(null);
      typeMAccumulatedSectionsRef.current = [];
      setTypeMAccumulatedSections([]);
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
    onSuccess: (data, variables, context) => {
      const aiMessageId = context?.aiMessageId;
      const characterId = data.characterId;
      const { output } = data;
      setTypeMPipelineStage(null);
      setTypeMPipelineDetail(undefined);
      setTypeMDocumentPlan(null);

      const messagesToAdd: Message[] = [];
      if (output.type === 'simple') {
        // Title from user message so doc, PDF, and section downloads are named meaningfully (not "Writing" / "Entry").
        const rawTitle = (variables.message || '').trim().replace(/\s+/g, ' ').slice(0, 50);
        const docTitle = rawTitle || 'Document';
        const sectionTitle = docTitle;
        messagesToAdd.push({
          id: 'ai-' + Date.now(),
          text: output.response,
          sender: 'ai',
          documentPlan: {
            title: docTitle,
            sections: [{ id: '1', title: sectionTitle, description: '', content: output.response }],
          },
          documentSections: [
            { id: '1', title: sectionTitle, description: '', content: output.response },
          ],
        });
      } else if (output.type === 'document' && output.plan && output.sections) {
        const sections = output.sections.length > 0 ? output.sections : typeMAccumulatedSectionsRef.current;
        // One message with full document (plan + all sections) so it shows as one paper, not one bubble per section
        messagesToAdd.push({
          id: 'ai-' + Date.now(),
          text: output.response,
          sender: 'ai',
          documentPlan: { title: output.plan.title, sections: output.plan.sections },
          documentSections: sections,
        });
      }

      setChats((prev) => {
        const base = prev[characterId]?.messages ?? [];
        const withoutStreaming = base.filter((msg) => msg.id !== aiMessageId);
        return {
          ...prev,
          [characterId]: {
            ...prev[characterId],
            messages: [...withoutStreaming, ...messagesToAdd],
            lastMessage: output.response,
            lastMessageTime: new Date(),
          },
        };
      });
      typeMAccumulatedSectionsRef.current = [];
      setTypeMAccumulatedSections([]);
    },
    onError: (_error, variables, context) => {
      setTypeMPipelineStage(null);
      setTypeMDocumentPlan(null);
      setTypeMAccumulatedSections([]);
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

  const handleSetMessageReaction = (characterId: string, messageId: string, reaction: string) => {
    setMessageReaction(characterId, messageId, reaction);
    setReactionPickerMessageId(null);
  };

  const handleSendMessage = () => {
    const isMahadCharacter = selectedCharacterId ? isMahad(selectedCharacterId) : false;
    const isImageMode = isMahadCharacter && inputMode === 'image';

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
      if (base64 && selectedCharacter && activePersona) {
        fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64, filename: 'audio.webm' }),
        })
          .then((res) => res.json())
          .then((data) => {
            const transcript = data?.text?.trim() || 'What did you say?';
            const history = buildHistory(
              selectedCharacterId,
              selectedCharacter!.name,
              getMessages(selectedCharacterId)
            ) as EmotionalConversationInput['history'];
            setIsWaitingForVoiceResponse(true);
            conversationMutation.mutate({
              message: transcript,
              persona: activePersona.systemPrompt,
              characterId: selectedCharacterId,
              history,
              sessionId: emotionalSessionIdsRef.current[selectedCharacterId] ??= `emotional-${selectedCharacterId}-${Date.now()}`,
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
      if (!selectedCharacter || !activePersona) return;
      const currentMessages = [...currentChatMessages, newUserMessage];
      const history = buildHistory(
        selectedCharacterId,
        selectedCharacter.name,
        currentMessages
      ) as EmotionalConversationInput['history'];
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
      const respondWithVoice = capabilities?.supportsVoiceMode && inputMode === 'voice';
      if (respondWithVoice) setIsWaitingForVoiceResponse(true);
      conversationMutation.mutate({
        message: caption,
        persona: activePersona.systemPrompt,
        characterId: selectedCharacterId,
        history,
        imageDataUri: imageUri,
        sessionId: emotionalSessionIdsRef.current[selectedCharacterId] ??= `emotional-${selectedCharacterId}-${Date.now()}`,
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

    if (!selectedCharacter || !activePersona) return;

    const currentMessages = [...currentChatMessages, newUserMessage];
    const history = buildHistory(
      selectedCharacterId,
      selectedCharacter.name,
      currentMessages
    ) as EmotionalConversationInput['history'];

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

    const respondWithVoice = capabilities?.supportsVoiceMode && inputMode === 'voice';
    if (respondWithVoice) setIsWaitingForVoiceResponse(true);

    if (isCodeM(selectedCharacterId)) {
      codeMAgentMutation.mutate({
        characterId: selectedCharacterId,
        message: effectiveText,
        history,
        sessionId: `codem-${selectedCharacterId}`,
      });
      return;
    }

    if (isTypeM(selectedCharacterId)) {
      typeMAgentMutation.mutate({
        characterId: selectedCharacterId,
        message: effectiveText,
        history,
        sessionId: `typem-${selectedCharacterId}`,
      });
      return;
    }

    conversationMutation.mutate({
      message: effectiveText,
      persona: activePersona.systemPrompt,
      characterId: selectedCharacterId,
      history,
      sessionId: emotionalSessionIdsRef.current[selectedCharacterId] ??= `emotional-${selectedCharacterId}-${Date.now()}`,
      respondWithVoice,
    } as EmotionalConversationInput & { respondWithVoice?: boolean });
  };

  const handleToggleRecording = async () => {
    const isVoiceMode = capabilities?.supportsVoiceMode && inputMode === 'voice';

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
      setRecording(false);
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
        setRecording(true);
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

  /** Persist notification mute preference */
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_MUTED_STORAGE_KEY, String(isNotificationMuted));
    } catch {
      // ignore
    }
  }, [isNotificationMuted]);

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
  if (!activePersona) {
  return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  return (
    <div ref={mainContentRef} className="flex h-screen w-full min-w-0 overflow-hidden bg-background" tabIndex={-1}>
      {/* Sidebar - WhatsApp style - Hidden on mobile */}
      <div className="hidden md:flex w-14 shrink-0 bg-[#e9edef] dark:bg-[#202c33] border-r border-border flex-col items-center py-3 gap-3">
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

      {/* Chat list: fixed 288px on desktop so it never fills the screen */}
      <div
        className={cn(
          'flex flex-col shrink-0 w-full md:w-[288px] md:min-w-[288px] md:max-w-[288px]',
          isMobileChatView && 'hidden md:flex'
        )}
      >
        <ChatSidebar
          characters={charactersList}
          chats={chats}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={handleCharacterSelect}
          isMobileChatView={isMobileChatView}
          onOpenSettings={() => {
            setProfileSheetTab('settings');
            setIsProfileSheetOpen(true);
          }}
        />
      </div>

      {/* Main Chat Area */}
      {selectedCharacter ? (
      <div className={cn(
        "flex-1 flex flex-col min-w-0 min-h-0 basis-0",
        capabilities?.useTerminalTheme
          ? "bg-[#f0fdf8] dark:bg-[#050e0a]"
          : "bg-[#ece5dd] dark:bg-[#0b141a] sm:bg-[#dedbd2] dark:sm:bg-[#0b141a]",
        !isMobileChatView && "hidden md:flex"
      )} style={capabilities?.useTerminalTheme ? {} : {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23f0f0f0%22 fill-opacity=%220.4%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}>
      <ChatHeader
        character={selectedCharacter}
        capabilities={capabilities}
        statusLine={
          (conversationMutation.isPending && isVoiceEnabled) || isWaitingForVoiceResponse
            ? (capabilities?.statusLabelPending ?? 'Recording…')
            : (capabilities?.statusLabelReady ?? selectedCharacter.description)
        }
        onBack={() => setIsMobileChatView(false)}
        onOpenSettings={() => {
          setProfileSheetTab('settings');
          setIsProfileSheetOpen(true);
        }}
        onViewContact={() => setIsViewContactOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        isNotificationMuted={isNotificationMuted}
        onToggleMute={() => setIsNotificationMuted((v) => !v)}
        onClearChat={() => {
          if (!selectedCharacterId) return;
          resetNotificationTracking();
          clearChat(selectedCharacterId);
          setSearchQuery('');
          setIsSearchOpen(false);
          toast({ title: 'Chat cleared', description: 'Messages cleared for this chat.' });
        }}
      />

      {/* Settings Dropdown - Hidden by default, shown on menu click */}
      <div className="bg-white dark:bg-[#1f2c34] border-b border-gray-200 dark:border-[#2a3942] px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
        {isCodeMSelected ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Mode:</label>
            <div className="h-8 inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {codeMPersona.name}
            </div>
          </div>
        ) : isTypeMSelected ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Mode:</label>
            <div className="h-8 inline-flex items-center gap-1.5 rounded-md border border-amber-800/25 dark:border-amber-600/30 bg-amber-50/80 dark:bg-amber-950/30 px-3 text-xs font-medium text-amber-900 dark:text-amber-200">
              <PenLine className="w-3.5 h-3.5" />
              {typeMPersona.name}
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Search bar - shown when Search is opened from menu */}
      {isSearchOpen && (
        <ChatSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
        />
      )}

      {/* Messages Area - WhatsApp style; Type M uses paper/letter theme */}
      <div className={cn(
        "flex-1 overflow-hidden relative",
        capabilities?.useWritingTheme && "bg-[#f5f1eb] dark:bg-[#1a1814]"
      )}>
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className={cn(
            "px-2 sm:px-4 py-4 space-y-1 min-h-full flex flex-col",
            capabilities?.messagesAlignStart ? "justify-start" : "justify-end",
            capabilities?.useWritingTheme && "bg-[#faf8f5] dark:bg-[#1c1917] min-h-full"
          )}>
            {/* Character dashboard pinned at top (Code M or Type M) */}
            {capabilities?.showDashboardAboveMessages && (
              <div
                className={`w-full mb-4 pb-4 border-b ${
                  isTypeMSelected ? 'border-amber-900/20 dark:border-amber-800/20' : 'border-emerald-900/30'
                }`}
              >
                {isTypeMSelected ? <TypeMDashboard /> : <HeroDashboard />}
              </div>
            )}
            {displayMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                {messages.length === 0 ? (
                  capabilities?.showEmptyStatePrompt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start a conversation with {selectedCharacter.name}
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No messages match your search.
                  </p>
                )}
              </div>
            )}
            {displayMessages.map((msg, index) => {
              const prevMsg = index > 0 ? displayMessages[index - 1] : null;
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
                  'group relative overflow-visible',
                  isTypeMSelected && msg.sender === 'ai' && msg.documentPlan
                    ? 'w-full max-w-full'
                    : 'max-w-[72%] sm:max-w-[75%] md:max-w-[65%]',
                  msg.sender === 'user' && 'ml-auto'
                )}>
                  <div
                    className={cn(
                      'relative rounded-lg px-2 py-1.5 text-[15px] break-words',
                      capabilities?.useTerminalTheme
                        ? msg.sender === 'user'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 rounded-tr-none border border-emerald-300 dark:border-emerald-800/60 font-mono text-sm'
                          : 'bg-white dark:bg-[#0d1a12] text-gray-800 dark:text-emerald-100 rounded-tl-none border-l-2 border-emerald-500 font-mono text-sm shadow-sm'
                        : isTypeMSelected && msg.sender === 'ai' && msg.documentPlan
                          ? 'bg-transparent p-0 rounded-xl shadow-none border-0 max-w-full'
                          : msg.sender === 'user'
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
                        {(msg.imageDataUri || msg.imageBase64) && msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && (() => {
                          const imgSrc = msg.imageDataUri || (msg.imageBase64 ? `data:image/png;base64,${msg.imageBase64}` : '');
                          if (!imgSrc) return null;
                          return (
                            <div className="mb-1.5 group relative inline-block max-w-full">
                              <img
                                src={imgSrc}
                                alt=""
                                className="max-w-full max-h-48 rounded object-contain"
                              />
                              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8 rounded-full shadow-md bg-black/50 hover:bg-black/70 text-white border-0"
                                  aria-label="View larger"
                                  onClick={() => setViewingImageSrc(imgSrc)}
                                >
                                  <Expand className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8 rounded-full shadow-md bg-black/50 hover:bg-black/70 text-white border-0"
                                  aria-label="Download"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = imgSrc;
                                    a.download = `emotiverse-image-${msg.id}.png`;
                                    a.click();
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                        {msg.id === IMAGE_GENERATING_PLACEHOLDER_ID ? (
                          <div className="flex items-center gap-2 py-2 px-1">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-600 dark:text-gray-300">Generating image...</p>
                          </div>
                        ) : msg.isStreaming && msg.text.length === 0 ? (
                          isCodeMSelected && codeMAgentMutation.isPending ? (
                            <div className="space-y-2">
                              {codeMProjectPlan && (
                                <CodeMProjectTodo
                                  plan={codeMProjectPlan}
                                  currentTaskIndex={codeMPipelineTaskIndex ?? 0}
                                  totalTasks={codeMPipelineTotalTasks ?? codeMProjectPlan.tasks.length}
                                />
                              )}
                              {codeMAccumulatedFiles.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                    Generated so far
                                  </p>
                                  {codeMAccumulatedFiles.map((file, idx) => (
                                    <CodeMCodeBlock
                                      key={`${file.path}-${idx}`}
                                      segment={{
                                        type: 'code',
                                        code: file.content,
                                        language: file.language,
                                        filename: file.path,
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                              <CodeMProgress
                                stage={codeMPipelineStage}
                                detail={codeMPipelineDetail}
                                taskIndex={codeMPipelineTaskIndex}
                                totalTasks={codeMPipelineTotalTasks}
                                attempt={codeMPipelineAttempt}
                              />
                            </div>
                          ) : isTypeMSelected && typeMAgentMutation.isPending ? (
                            <div className="space-y-2">
                              {typeMDocumentPlan && (
                                <TypeMOutlineTodo
                                  plan={typeMDocumentPlan}
                                  currentSectionIndex={typeMPipelineSectionIndex ?? 0}
                                  totalSections={typeMDocumentPlan.sections.length}
                                />
                              )}
                              {typeMAccumulatedSections.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <PenLine className="w-3 h-3" />
                                    Written so far
                                  </p>
                                  {typeMAccumulatedSections.map((sec, idx) => (
                                    <TypeMSectionBlock
                                      key={`${sec.id}-${idx}`}
                                      title={sec.title}
                                      content={sec.content}
                                    />
                                  ))}
                                </div>
                              )}
                              <TypeMProgress
                                stage={typeMPipelineStage}
                                detail={typeMPipelineDetail}
                                sectionIndex={typeMPipelineSectionIndex}
                                totalSections={typeMPipelineTotalSections}
                                attempt={typeMPipelineAttempt}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5 py-1">
                              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
                              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                            </div>
                          )
                        ) : isCodeMSelected && msg.sender === 'ai' && (msg.projectFiles?.length > 0 || msg.agentPlan) ? (
                          <CodeMProjectView
                            files={msg.projectFiles ?? []}
                            plan={msg.agentPlan}
                          />
                        ) : isTypeMSelected && msg.sender === 'ai' && msg.documentPlan ? (
                          <TypeMPaperView
                            documentPlan={msg.documentPlan}
                            documentSections={msg.documentSections ?? []}
                          />
                        ) : isCodeMSelected && msg.sender === 'ai' && msg.segments && msg.segments.length > 0 ? (
                          <div className="space-y-1.5 pb-0.5">
                            {msg.segments.map((seg, idx) =>
                              seg.type === 'text' ? (
                                <p
                                  key={idx}
                                  className={cn(
                                    "whitespace-pre-wrap leading-relaxed",
                                    capabilities?.useTerminalTheme && "before:content-['▸_'] before:text-emerald-500"
                                  )}
                                >
                                  {renderInlineBold(seg.text)}
                                </p>
                              ) : (
                                <CodeMCodeBlock key={idx} segment={seg} />
                              )
                            )}
                          </div>
                        ) : (
                          <p className={cn(
                            "whitespace-pre-wrap leading-relaxed pb-0.5",
                            capabilities?.useTerminalTheme && msg.sender === 'ai' && "before:content-['▸_'] before:text-emerald-500"
                          )}>{msg.text}</p>
                        )}
                        {msg.id !== IMAGE_GENERATING_PLACEHOLDER_ID && !msg.isStreaming && (
                          <div className={cn(
                            'flex items-center gap-1 mt-0.5 flex-wrap',
                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className={cn(
                              'text-[11px] leading-none',
                              capabilities?.useTerminalTheme
                                ? 'text-emerald-500 dark:text-emerald-800 font-mono'
                                : 'text-gray-500 dark:text-gray-400'
                            )}>
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
                                onClick={() => selectedCharacterId && handleSetMessageReaction(selectedCharacterId, msg.id, emoji)}
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

      {/* Input Area */}
      <div className={cn(
        "w-full min-w-0 px-4 py-4 flex-shrink-0 border-t",
        capabilities?.useTerminalTheme
          ? "bg-[#ecfdf5] dark:bg-[#0a0f0d] border-emerald-200 dark:border-emerald-900/40"
          : "bg-[#f0f0f0] dark:bg-[#111b21] border-gray-300 dark:border-[#2a3942]"
      )}>
        {/* Mahad-only: Chat / Voice / Image mode selector */}
        {selectedCharacterId && isMahad(selectedCharacterId) && (
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
        {selectedCharacterId && isMahad(selectedCharacterId) && inputMode === 'image' && (
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
        <div className={cn(
          "w-full min-w-0 flex items-center gap-2 rounded-full px-2 py-2 relative",
          capabilities?.useTerminalTheme
            ? "bg-white dark:bg-[#0d1a12] border border-emerald-300 dark:border-emerald-900/60 rounded-xl text-gray-800 dark:text-emerald-200"
            : "bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-white"
        )}>
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
            className="flex-1 min-w-0 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 max-h-24 text-[15px] text-[#111b21] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 min-h-[40px]"
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
                disabled={
                  conversationMutation.isPending ||
                  generateImageMutation.isPending ||
                  (isCodeMSelected ? codeMAgentMutation.isPending : isTypeMSelected ? typeMAgentMutation.isPending : false)
                }
                size="icon"
                className="h-9 w-9 shrink-0 bg-primary hover:bg-[#064e45] dark:hover:bg-[#064e45] text-primary-foreground rounded-full transition-colors"
                aria-label="Send"
              >
                {conversationMutation.isPending || generateImageMutation.isPending || (isCodeMSelected && codeMAgentMutation.isPending) || (isTypeMSelected && typeMAgentMutation.isPending) ? (
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
      ) : null}

    <ChatOverlays
      isProfileSheetOpen={isProfileSheetOpen}
      onProfileSheetOpenChange={setIsProfileSheetOpen}
      profileSheetTab={profileSheetTab}
      onAfterSignOut={() => setIsProfileSheetOpen(false)}
      mainContentRef={mainContentRef}
      viewingImageSrc={viewingImageSrc}
      onViewingImageSrcChange={setViewingImageSrc}
      isViewContactOpen={isViewContactOpen}
      onViewContactOpenChange={setIsViewContactOpen}
      selectedCharacter={selectedCharacter}
    />
    </div>
  );
}
