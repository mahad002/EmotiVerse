
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
    <div className="container mx-auto px-4 py-4 flex flex-col h-screen max-w-3xl">
      <header className="mb-4 text-center flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
          EmotiVerse
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore conversations with AI.
        </p>
      </header>

      <Card className="flex-1 flex flex-col shadow-lg border bg-card min-h-0">
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Conversation with Mahad</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-48">
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
                    className="h-9 text-xs"
                  >
                    <SelectValue placeholder="Select a persona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsVoiceEnabled((v) => !v)}
                className="h-9 w-9"
                aria-label={
                  isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'
                }
              >
                {isVoiceEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-2 sm:p-4 sm:pt-0">
          <ScrollArea className="flex-grow pr-4" ref={scrollAreaRef}>
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full',
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.sender === 'ai' && (
                    <Avatar className="h-8 w-8 self-start">
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'relative max-w-[75%] rounded-2xl px-4 py-2 shadow-sm text-sm leading-relaxed border',
                      msg.sender === 'user'
                        ? 'bg-card text-card-foreground rounded-br-lg'
                        : 'bg-secondary text-secondary-foreground rounded-bl-lg'
                    )}
                  >
                    {msg.isStreaming && msg.text.length === 0 ? (
                      <div className="flex items-center space-x-1 py-1">
                        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-75"></span>
                        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
                      </div>
                    ) : (
                      <p className="pr-6 whitespace-pre-wrap">{msg.text}</p>
                    )}
                     {!msg.isStreaming && msg.text && (
                      <div className="absolute bottom-1.5 right-2 flex items-center">
                        <CheckCheck className="h-4 w-4 text-ring" />
                      </div>
                    )}
                  </div>
                  {msg.sender === 'user' && (
                    <Avatar className="h-8 w-8 self-start">
                      <AvatarFallback className="bg-transparent">
                        <User className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <p>Select a persona and start the conversation.</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="mt-auto pt-2">
            <div className="flex items-end gap-2 p-1.5 rounded-2xl bg-card border">
              <Textarea
                ref={textAreaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Message Mahad..."
                className="flex-grow resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 max-h-32"
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
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <Mic
                  className={cn(
                    'h-5 w-5',
                    isRecording && 'text-primary animate-pulse'
                  )}
                />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 rounded-full"
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
  );
}
