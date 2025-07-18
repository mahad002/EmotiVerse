
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
  CheckCheck,
  Volume2,
  VolumeX,
  Mic,
  Sparkles,
  Heart,
  Zap,
  MessageCircle,
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
      const maxHeight = 128;
      const newHeight = Math.min(textAreaRef.current.scrollHeight, maxHeight);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  }, [userInput]);

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-6 flex flex-col h-screen max-w-4xl">
        <header className="mb-6 text-center flex-shrink-0">
          <div className="relative inline-block">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-2 floating-animation">
              <span className="inline-flex items-center gap-3">
                <Sparkles className="h-12 w-12 text-yellow-300" />
                EmotiVerse
                <Heart className="h-10 w-10 text-pink-300" />
              </span>
            </h1>
            <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl -z-10"></div>
          </div>
          <p className="text-white/90 mt-3 text-lg font-medium">
            Experience meaningful conversations with AI personalities
          </p>
          <div className="flex justify-center mt-4 gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <MessageCircle className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Zap className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
          </div>
        </header>

        <Card className="flex-1 flex flex-col shadow-2xl border-0 glass-effect backdrop-blur-xl min-h-0 overflow-hidden">
          <CardHeader className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Chat with Mahad
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="w-56">
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
                    <SelectTrigger className="h-10 text-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all">
                      <SelectValue placeholder="Choose personality..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id} className="hover:bg-purple-50">
                          <div className="flex flex-col">
                            <span className="font-medium">{persona.name}</span>
                            <span className="text-xs text-muted-foreground">{persona.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVoiceEnabled((v) => !v)}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all duration-300",
                    isVoiceEnabled 
                      ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" 
                      : "bg-white/20 text-white/70 hover:bg-white/30"
                  )}
                  aria-label={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
                >
                  {isVoiceEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-grow px-6" ref={scrollAreaRef}>
              <div className="space-y-6 py-6">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full',
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {msg.sender === 'ai' && (
                      <Avatar className="h-10 w-10 ring-2 ring-purple-200 ring-offset-2">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
                          M
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'message-bubble relative max-w-[80%] rounded-2xl px-5 py-3 shadow-lg text-sm leading-relaxed',
                        msg.sender === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md'
                          : 'bg-white border border-purple-100 text-gray-800 rounded-bl-md'
                      )}
                    >
                      {msg.isStreaming && msg.text.length === 0 ? (
                        <div className="flex items-center space-x-2 py-2">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                            <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                          </div>
                          <span className="text-purple-600 text-xs">Mahad is thinking...</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                      {!msg.isStreaming && msg.text && msg.sender === 'user' && (
                        <div className="absolute -bottom-1 -right-1 flex items-center">
                          <CheckCheck className="h-4 w-4 text-white/80" />
                        </div>
                      )}
                    </div>
                    {msg.sender === 'user' && (
                      <Avatar className="h-10 w-10 ring-2 ring-blue-200 ring-offset-2">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
                        <MessageCircle className="h-10 w-10 text-purple-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Start Your Conversation
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Choose a personality above and begin chatting with Mahad. Each persona offers a unique conversational experience.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10">
              <div className="flex items-end gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                <Textarea
                  ref={textAreaRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your message to Mahad..."
                  className="flex-grow resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 max-h-32 placeholder:text-gray-500"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleToggleRecording}
                  disabled={!isSpeechSupported || conversationMutation.isPending}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-12 w-12 shrink-0 rounded-full transition-all duration-300",
                    isRecording 
                      ? "bg-red-500/20 text-red-600 pulse-ring" 
                      : "hover:bg-purple-100 text-purple-600"
                  )}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim()}
                  size="icon"
                  className="h-12 w-12 shrink-0 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-full shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {conversationMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
