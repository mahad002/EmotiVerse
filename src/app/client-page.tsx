
'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsDialog } from '@/components/settings-dialog';
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

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean;
}

interface ChatData {
  characterId: string;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
}

// Extend window type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isMobileChatView, setIsMobileChatView] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || (personas.length > 0 ? personas[0] : null);
  const selectedCharacter =
    selectedCharacterId ? charactersList.find((c) => c.id === selectedCharacterId) : null;

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: 'Speech Recognition Error',
          description: `An error occurred: ${event.error}. Please check your microphone permissions.`,
          variant: 'destructive',
        });
        setIsRecording(false);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');
        setUserInput(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech Recognition not supported in this browser.');
    }
  }, [toast]);

  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(text),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
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
        throw new Error('Failed to process conversation');
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

      // Remove streaming message
      setChats((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          messages: (prev[characterId]?.messages || []).filter((msg) => msg.id !== aiMessageId),
        },
      }));

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
    onError: (error, variables, context) => {
      toast({
        title: 'Error in Conversation',
        description: error.message || 'AI could not respond.',
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

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const currentChatMessages = chats[selectedCharacterId]?.messages || [];
    if (currentChatMessages.some((msg) => msg.isStreaming)) {
      const newUserMessage: Message = {
        id: Date.now().toString() + '-user',
        text: userInput,
        sender: 'user',
      };
      setChats((prev) => ({
        ...prev,
        [selectedCharacterId]: {
          ...prev[selectedCharacterId],
          messages: [...(prev[selectedCharacterId]?.messages || []), newUserMessage],
          lastMessage: userInput,
          lastMessageTime: new Date(),
        },
      }));
      setUserInput('');
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString() + '-user',
      text: userInput,
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
        lastMessage: userInput,
        lastMessageTime: new Date(),
      },
    }));
    setUserInput('');

    conversationMutation.mutate({
      message: userInput,
      persona: selectedPersona.systemPrompt,
      characterId: selectedCharacterId,
      history,
    });
  };

  const handleToggleRecording = () => {
    if (!isSpeechSupported || !recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
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
    if (isVoiceEnabled && !isAudioPlaying && audioQueue.length > 0) {
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

        // Attempt to play
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsAudioPlaying(true);
            })
            .catch((error) => {
              console.error('Audio play() promise rejected:', error);
              setIsAudioPlaying(false);
              setAudioQueue((prev) => prev.slice(1));
              if (audioRef.current) {
                audioRef.current.src = '';
                audioRef.current = null;
              }
            });
        }
      } catch (error) {
        console.error('Error creating audio element:', error);
        setIsAudioPlaying(false);
        setAudioQueue((prev) => prev.slice(1));
      }
    }
  }, [audioQueue, isAudioPlaying, isVoiceEnabled]);

  useEffect(() => {
    if (scrollAreaRef.current) {
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
    <div className="flex h-screen w-full bg-background">
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
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* User avatar at bottom */}
        <Avatar className="h-12 w-12 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
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
              onClick={() => setIsSettingsOpen(true)}
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

      {/* Main Chat Area - Hidden on mobile when in list view */}
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
              {selectedCharacter.description}
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
                onClick={() => setIsSettingsOpen(true)}
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
                  !isConsecutive && 'mt-2'
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
                
                <div
                  className={cn(
                    'relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-2 py-1.5 text-[15px] break-words',
                    msg.sender === 'user'
                      ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none shadow-sm ml-auto dark:bg-[#005c4b] dark:text-white'
                      : 'bg-white text-gray-900 rounded-tl-none shadow-sm dark:bg-[#1f2c34] dark:text-white'
                  )}
                >
                  {msg.isStreaming && msg.text.length === 0 ? (
                    <div className="flex items-center space-x-1.5 py-1">
                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed pb-0.5">{msg.text}</p>
                  )}
                  
                  {!msg.isStreaming && msg.text && (
                    <div className={cn(
                      "flex items-center gap-1 mt-0.5",
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">
                        {new Date().toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </span>
                      {msg.sender === 'user' && (
                        <CheckCheck className="h-3 w-3 text-blue-500 flex-shrink-0 ml-0.5" />
                      )}
                    </div>
                  )}
                </div>
                
                {msg.sender === 'user' && (
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-[#075e54] text-white text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - WhatsApp style */}
      {/* py-4 = padding for outer gray area (top/bottom spacing) */}
      <div className="bg-[#f0f0f0] dark:bg-[#111b21] px-4 py-4 flex-shrink-0 border-t border-gray-300 dark:border-[#2a3942]">
        {/* py-2 = padding for inner white rounded input bar */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#2a3942] rounded-full px-2 py-2 text-[#111b21] dark:text-white relative">
          {/* h-9 w-9 = button size (36px) - smaller icons for WhatsApp style */}
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
              <div className="hidden md:block w-56 space-y-1">
                {/* Document */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle document upload
                  }}
                >
                  <div className="p-2 rounded-md bg-[#9b51e0] bg-opacity-20">
                    <FileText className="h-5 w-5 text-[#9b51e0]" />
                  </div>
                  <span className="text-white text-sm font-normal">Document</span>
                </button>

                {/* Photos & videos */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle photos & videos
                  }}
                >
                  <div className="p-2 rounded-md bg-[#0086ff] bg-opacity-20">
                    <ImageIcon className="h-5 w-5 text-[#0086ff]" />
                  </div>
                  <span className="text-white text-sm font-normal">Photos & videos</span>
                </button>

                {/* Camera */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle camera
                  }}
                >
                  <div className="p-2 rounded-md bg-[#e91e63] bg-opacity-20">
                    <Camera className="h-5 w-5 text-[#e91e63]" />
                  </div>
                  <span className="text-white text-sm font-normal">Camera</span>
                </button>

                {/* Audio */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle audio
                  }}
                >
                  <div className="p-2 rounded-md bg-[#ff9800] bg-opacity-20">
                    <Headphones className="h-5 w-5 text-[#ff9800]" />
                  </div>
                  <span className="text-white text-sm font-normal">Audio</span>
                </button>

                {/* Contact */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle contact
                  }}
                >
                  <div className="p-2 rounded-md bg-[#00bcd4] bg-opacity-20">
                    <User className="h-5 w-5 text-[#00bcd4]" />
                  </div>
                  <span className="text-white text-sm font-normal">Contact</span>
                </button>

                {/* Poll */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle poll
                  }}
                >
                  <div className="p-2 rounded-md bg-[#ff9800] bg-opacity-20">
                    <BarChart3 className="h-5 w-5 text-[#ff9800]" />
                  </div>
                  <span className="text-white text-sm font-normal">Poll</span>
                </button>

                {/* Event */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle event
                  }}
                >
                  <div className="p-2 rounded-md bg-[#e91e63] bg-opacity-20">
                    <Calendar className="h-5 w-5 text-[#e91e63]" />
                  </div>
                  <span className="text-white text-sm font-normal">Event</span>
                </button>

                {/* New sticker */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#3b4a54] dark:hover:bg-[#3b4a54] transition-colors text-left"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false);
                    // Handle new sticker
                  }}
                >
                  <div className="p-2 rounded-md bg-[#25d366] bg-opacity-20">
                    <StickyNote className="h-5 w-5 text-[#25d366]" />
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
          
          {/* Text input - py-2 = padding inside textarea, max-h-24 = allows growth for multi-line (up to 96px) */}
          <Textarea
            ref={textAreaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a message"
            className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 max-h-24 text-[15px] text-[#111b21] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 min-h-[40px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          {/* Send button (when typing) or Mic button (when empty) - WhatsApp style */}
          {/* h-9 w-9 = matches other icon buttons */}
          {userInput.trim() ? (
            <Button
              onClick={handleSendMessage}
              disabled={conversationMutation.isPending}
              size="icon"
              className="h-9 w-9 shrink-0 bg-primary hover:bg-[#064e45] dark:hover:bg-[#064e45] text-primary-foreground rounded-full transition-colors"
            >
              {conversationMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleToggleRecording}
              disabled={!isSpeechSupported || conversationMutation.isPending}
              size="icon"
              variant="ghost"
              className={cn(
                "h-9 w-9 shrink-0 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-200 dark:hover:bg-[#3b4a54]",
                isRecording && "text-red-500 dark:text-red-400"
              )}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Mic
                className={cn(
                  'h-5 w-5',
                  isRecording && 'animate-pulse'
                )}
              />
            </Button>
          )}
        </div>
      </div>
    </div>

    <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
