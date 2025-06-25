
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { defaultPersonas, type Persona } from '@/config/personas';
import { generateEmotionalPrompt } from '@/ai/flows/generate-emotional-prompt';
import { emotionalConversation } from '@/ai/flows/emotional-conversation';
import { Loader2, Send, Wand2, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export default function ClientPage() {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPersonas[0].id
  );
  const [topic, setTopic] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const promptMutation = useMutation({
    mutationFn: generateEmotionalPrompt,
    onSuccess: (data) => {
      setGeneratedPrompt(data.prompt);
      toast({
        title: 'Prompt Generated!',
        description: 'A new starting prompt has been created.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Generating Prompt',
        description: error.message || 'Could not generate prompt.',
        variant: 'destructive',
      });
    },
  });

  const conversationMutation = useMutation({
    mutationFn: emotionalConversation,
    onSuccess: (data) => {
      setMessages((prev) => {
        // Filter out the "thinking" message and add the new AI response
        const newMessages = prev.filter((msg) => msg.id !== 'thinking-message');
        return [
          ...newMessages,
          {
            id: Date.now().toString() + '-ai',
            text: data.response,
            sender: 'ai',
          },
        ];
      });
    },
    onError: (error) => {
      toast({
        title: 'Error in Conversation',
        description: error.message || 'AI could not respond.',
        variant: 'destructive',
      });
      // Just remove the thinking message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== 'thinking-message')
      );
    },
  });

  const handleGeneratePrompt = () => {
    if (!topic.trim()) return;

    promptMutation.mutate({
      emotion: selectedPersona.emotionForPrompt,
      topic: topic,
    });
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString() + '-user',
      text: userInput,
      sender: 'user',
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');

    // Add a temporary "thinking" message for AI
    setMessages((prev) => [
      ...prev,
      {
        id: 'thinking-message',
        text: '...',
        sender: 'ai',
      },
    ]);

    conversationMutation.mutate({
      message: userInput,
      persona: selectedPersona.systemPrompt,
    });
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div > div'); // Target the viewport
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);
  

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen max-w-3xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-500 via-teal-400 to-purple-600 bg-clip-text text-transparent">
          EmotiVerse
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore conversations with AI.
        </p>
      </header>

      <Card className="mb-6 shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-2xl">Setup Your Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium mb-1">
              Choose an Emotional Persona
            </label>
            <Select
              value={selectedPersonaId}
              onValueChange={setSelectedPersonaId}
            >
              <SelectTrigger id="persona-select" className="w-full">
                <SelectValue placeholder="Select a persona..." />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      <span>{persona.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPersona && (
                <p className="text-sm text-muted-foreground mt-2">{selectedPersona.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="topic-input" className="block text-sm font-medium mb-1">
              Topic for Initial Prompt (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., my day, a recent dream, future plans"
                className="flex-grow"
              />
              <Button
                onClick={handleGeneratePrompt}
                disabled={promptMutation.isPending || !topic.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {promptMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Wand2 className="h-5 w-5" />
                )}
                <span className="ml-2 hidden sm:inline">Generate Prompt</span>
              </Button>
            </div>
          </div>

          {generatedPrompt && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-md border border-secondary">
              <p className="text-sm font-medium text-secondary-foreground">Suggested starting prompt:</p>
              <p className="text-sm text-secondary-foreground/80">{generatedPrompt}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-grow flex flex-col shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-2xl">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-0 sm:p-6 sm:pt-0">
          <ScrollArea className="flex-grow p-4 sm:p-0 pr-2" ref={scrollAreaRef}>
            <div className="space-y-4 ">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-3 shadow-md text-sm ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-card text-card-foreground border border-border rounded-bl-none'
                    }`}
                  >
                    {msg.id === 'thinking-message' && conversationMutation.isPending ? (
                        <div className="flex items-center space-x-1">
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-75"></span>
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
                        </div>
                    ) : (
                        msg.text
                    )}
                  </div>
                  {msg.sender === 'user' && (
                     <Avatar className="h-8 w-8">
                      <User className="h-5 w-5 text-primary" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <p>Start the conversation by typing a message below.</p>
                  {generatedPrompt ? <p>You can use the suggested prompt above as inspiration!</p> : 
                  <p>Or generate a prompt to help you get started.</p>}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={`Chat with ${selectedPersona.name}...`}
                className="flex-grow resize-none"
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
                disabled={conversationMutation.isPending || !userInput.trim()}
                size="icon"
                className="h-10 w-10 shrink-0"
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
       <footer className="text-center py-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Inspirovix. Crafted with care.
      </footer>
    </div>
  );
}
