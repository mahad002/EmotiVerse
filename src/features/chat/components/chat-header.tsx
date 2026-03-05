'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, MoreVertical, Settings, Search as SearchIcon, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character } from '@/config/characters';
import type { CharacterCapabilities } from '@/features/chat/lib/character-capabilities';

export interface ChatHeaderProps {
  character: Character;
  capabilities: CharacterCapabilities | null;
  statusLine: string;
  onBack: () => void;
  onOpenSettings: () => void;
  onViewContact: () => void;
  onOpenSearch: () => void;
  isNotificationMuted: boolean;
  onToggleMute: () => void;
  onClearChat: () => void;
}

export function ChatHeader({
  character,
  capabilities,
  statusLine,
  onBack,
  onOpenSettings,
  onViewContact,
  onOpenSearch,
  isNotificationMuted,
  onToggleMute,
  onClearChat,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'px-4 py-3 flex items-center justify-between shadow-md z-10 flex-shrink-0',
        capabilities?.useTerminalTheme
          ? 'bg-[#ecfdf5] dark:bg-[#0a0f0d] border-b border-emerald-200 dark:border-emerald-900/40 text-gray-900 dark:text-white'
          : 'bg-primary text-primary-foreground'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10 text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10"
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 cursor-pointer border-2 border-emerald-800/40">
          <AvatarFallback
            className={cn(
              'font-semibold',
              capabilities?.useTerminalTheme
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-white/20 text-primary-foreground'
            )}
          >
            {character.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer">
          <h2
            className={cn(
              'text-base font-medium truncate',
              capabilities?.useTerminalTheme
                ? 'text-emerald-700 dark:text-emerald-300 font-mono'
                : 'text-primary-foreground'
            )}
          >
            {character.name}
          </h2>
          <p
            className={cn(
              'text-xs truncate opacity-90',
              capabilities?.useTerminalTheme
                ? 'text-emerald-500 dark:text-emerald-600 font-mono opacity-100'
                : 'text-primary-foreground/80'
            )}
          >
            {statusLine}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10 rounded-full"
              aria-label="Menu"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewContact} className="cursor-pointer">
              View contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSearch} className="cursor-pointer">
              <SearchIcon className="h-4 w-4 mr-2" />
              Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleMute} className="cursor-pointer">
              {isNotificationMuted ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Mute notifications
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onClearChat}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              Clear chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
