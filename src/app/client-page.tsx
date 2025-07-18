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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { defaultPersonas, type Persona } from '@/config/personas';
import {
  emotionalConversation,
  type EmotionalConversationInput,
} from '@/ai/flows/emotional-conversation';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import {
  Loader2,
  Send,
  User,
  Volume2,
  VolumeX,
  Mic,
  MessageCircle,
  Settings,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean;
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
  const [showSplash, setShowSplash] = useState(true);
  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPersonas[0].id
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || personas[0];

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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
    mutationFn: textToSpeech,
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
    mutationFn: emotionalConversation,
    onMutate: async (variables) => {
      const aiMessageId = 'ai-streaming-' + Date.now();
      const newAiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        isStreaming: true,
      };
      setMessages((prev) => [...prev, newAiMessage]);
      return { aiMessageId };
    },
    onSuccess: async (data, variables, context) => {
      const aiMessageId = context?.aiMessageId;
      if (!aiMessageId || !data.response) return;

      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));

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
        setMessages((prev) => [...prev, newAiMessage]);

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
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== context.aiMessageId)
        );
      }
    },
  });

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    if (messages.some((msg) => msg.isStreaming)) {
      const newUserMessage: Message = {
        id: Date.now().toString() + '-user',
        text: userInput,
        sender: 'user',
      };
      setMessages((prev) => [...prev, newUserMessage]);
      setUserInput('');
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString() + '-user',
      text: userInput,
      sender: 'user',
    };

    const currentMessages = [...messages, newUserMessage];
    const history = currentMessages
      .slice(-10)
      .map(({ sender, text }) => ({
        sender: sender === 'ai' ? 'Mahad' : 'user',
        text,
      })) as EmotionalConversationInput['history'];

    setMessages(currentMessages);
    setUserInput('');

    conversationMutation.mutate({
      message: userInput,
      persona: selectedPersona.systemPrompt,
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
      setAudioQueue([]);
      setIsAudioPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isVoiceEnabled]);

  useEffect(() => {
    if (isVoiceEnabled && !isAudioPlaying && audioQueue.length > 0) {
      const nextAudioSrc = audioQueue[0];
      audioRef.current = new Audio(nextAudioSrc);

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch((error) => {
            console.error('Audio playback failed:', error);
            setIsAudioPlaying(false);
            setAudioQueue((prev) => prev.slice(1));
          });
      }

      audioRef.current.onended = () => {
        setIsAudioPlaying(false);
        setAudioQueue((prev) => prev.slice(1));
      };
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsAudioPlaying(false);
        setAudioQueue((prev) => prev.slice(1));
      };
    }
  }, [audioQueue, isAudioPlaying, isVoiceEnabled]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div > div');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const maxHeight = 120;
      const newHeight = Math.min(textAreaRef.current.scrollHeight, maxHeight);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  }, [userInput]);

  // Splash Screen
  if (showSplash) {
    return (
      <div className="min-h-screen min-h-dvh splash-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="logo-animation mb-8">
            <img 
              src="/image.png" 
              alt="Inspirovix Technologies" 
              className="w-32 h-32 mx-auto mb-6 rounded-2xl shadow-lg"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-slate-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Inspirovix
            </h1>
            <p className="text-xl text-slate-600" style={{ fontFamily: 'MS Thar, serif' }}>
              Technologies
            </p>
          </div>
          <div className="mt-8">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh minimal-gradient">
      <div className="flex flex-col h-screen h-dvh max-w-md mx-auto bg-white shadow-xl">
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">EmotiVerse</h1>
                <p className="text-xs text-slate-500">AI Conversation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsVoiceEnabled((v) => !v)}
                className={cn(
                  "w-9 h-9 rounded-full",
                  isVoiceEnabled 
                    ? "bg-slate-100 text-slate-700" 
                    : "text-slate-400"
                )}
              >
                {isVoiceEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Persona Selection */}
        <div className="flex-shrink-0 px-4 py-3 bg-slate-50 border-b border-slate-200">
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
            <SelectTrigger className="w-full h-10 bg-white border-slate-200">
              <SelectValue placeholder="Choose personality..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{persona.name}</span>
                    <span className="text-xs text-slate-500">{persona.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            <div className="space-y-4 py-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2 slide-up',
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {msg.sender === 'ai' && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'message-bubble max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                      msg.sender === 'user'
                        ? 'bg-slate-800 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    )}
                  >
                    {msg.isStreaming && msg.text.length === 0 ? (
                      <div className="flex items-center space-x-1 py-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                        <span className="text-slate-500 text-xs ml-2">Thinking...</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                  {msg.sender === 'user' && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-slate-800 text-white text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">
                    Start Chatting
                  </h3>
                  <p className="text-slate-500 text-sm px-8">
                    Choose a personality and begin your conversation with Mahad
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2 p-2 rounded-2xl bg-slate-50 border border-slate-200">
              <Textarea
                ref={textAreaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 max-h-24 text-sm placeholder:text-slate-400"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {isSpeechSupported && (
                <Button
                  type="button"
                  onClick={handleToggleRecording}
                  disabled={conversationMutation.isPending}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "w-10 h-10 flex-shrink-0 rounded-full",
                    isRecording 
                      ? "bg-red-100 text-red-600" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Mic className={cn("w-4 h-4", isRecording && "animate-pulse")} />
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                size="icon"
                className="w-10 h-10 flex-shrink-0 bg-slate-800 hover:bg-slate-700 rounded-full disabled:opacity-50"
              >
                {conversationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}