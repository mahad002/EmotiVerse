
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
import { Loader2, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean;
}

export default function ClientPage() {
  const { toast } = useToast();
  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPersonas[0].id
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const conversationMutation = useMutation({
    mutationFn: emotionalConversation,
    onMutate: async (variables) => {
      // Add a streaming placeholder for the AI response
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

      // Remove the streaming placeholder
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));

      // Add the AI response chunks as separate messages
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
      }
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Error in Conversation',
        description: error.message || 'AI could not respond.',
        variant: 'destructive',
      });
      // Clean up placeholder on error
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div > div');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const maxHeight = 128; // 8rem
      const newHeight = Math.min(textAreaRef.current.scrollHeight, maxHeight);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  }, [userInput]);

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-2rem)] max-w-3xl">
      <header className="mb-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
          EmotiVerse
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore conversations with AI.
        </p>
      </header>

      <Card className="flex-grow flex flex-col shadow-lg border bg-card">
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Conversation with Mahad</CardTitle>
            <div className="w-48">
              <Select
                value={selectedPersonaId}
                onValueChange={setSelectedPersonaId}
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
                      'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed',
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-lg'
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
                      msg.text
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
