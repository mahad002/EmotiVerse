'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character } from '@/config/characters';
import type { ChatData } from '@/features/chat/lib/chat-types';
import { CODEM_CHARACTER_ID, TYPEM_CHARACTER_ID } from '@/features/chat/lib/chat-types';

export interface ChatSidebarProps {
  characters: Character[];
  chats: Record<string, ChatData>;
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  isMobileChatView: boolean;
  onOpenSettings: () => void;
}

export function ChatSidebar({
  characters,
  chats,
  selectedCharacterId,
  onSelectCharacter,
  isMobileChatView,
  onOpenSettings,
}: ChatSidebarProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-0 bg-[#ffffff] dark:bg-[#111b21] border-r border-border w-full',
        isMobileChatView && 'hidden md:flex'
      )}
    >
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
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-[#54656f] hover:bg-[#dde3e7] hover:text-[#111b21] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
            aria-label="Settings"
            onClick={onOpenSettings}
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
      <div className="flex-1 overflow-y-auto">
        {characters.map((character) => {
          const chat = chats[character.id];
          const lastMessage = chat?.lastMessage ?? 'No messages yet';
          const lastTime = chat?.lastMessageTime
            ? new Date(chat.lastMessageTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : '';
          return (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character.id)}
              className={cn(
                'px-4 py-3 cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] border-l-4 transition-colors',
                selectedCharacterId === character.id
                  ? 'bg-[#e9edef] dark:bg-[#2a3942] border-primary'
                  : 'border-transparent'
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 flex-shrink-0 overflow-hidden">
                  {character.id === CODEM_CHARACTER_ID ? (
                    <AvatarFallback className="rounded-full w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-lg font-mono border-2 border-emerald-400/50 shadow-sm">
                      C
                    </AvatarFallback>
                  ) : character.id === TYPEM_CHARACTER_ID ? (
                    <AvatarFallback className="rounded-full w-full h-full flex items-center justify-center bg-amber-600 text-amber-50 font-bold text-lg border-2 border-amber-400/50 shadow-sm" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      T
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {character.name.charAt(0)}
                    </AvatarFallback>
                  )}
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
  );
}
