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
  const isCodeM = capabilities?.useTerminalTheme;
  const isTypeM = capabilities?.useWritingTheme;

  return (
    <header
      className={cn(
        'px-4 py-3 flex items-center justify-between shadow-md z-10 flex-shrink-0',
        isCodeM &&
          'bg-[#ecfdf5] dark:bg-[#0a0f0d] border-b border-emerald-200 dark:border-emerald-900/40 text-gray-900 dark:text-white',
        isTypeM &&
          'bg-[#faf8f5] dark:bg-[#1c1917] border-b border-amber-200/80 dark:border-amber-900/50 text-stone-900 dark:text-stone-100',
        !isCodeM && !isTypeM && 'bg-primary text-primary-foreground'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'md:hidden h-10 w-10 rounded-full',
            isCodeM && 'text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
            isTypeM && 'text-amber-800 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-900/50',
            !isCodeM && !isTypeM && 'text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10'
          )}
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar
          className={cn(
            'h-10 w-10 cursor-pointer border-2',
            isCodeM && 'border-emerald-800/40',
            isTypeM && 'border-amber-700/50 dark:border-amber-600/50',
            !isCodeM && !isTypeM && 'border-white/20'
          )}
        >
          <AvatarFallback
            className={cn(
              'font-semibold',
              isCodeM && 'bg-emerald-950 text-emerald-400',
              isTypeM && 'bg-amber-900/80 text-amber-200 dark:bg-amber-800/60 dark:text-amber-100',
              !isCodeM && !isTypeM && 'bg-white/20 text-primary-foreground'
            )}
          >
            {character.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer">
          <h2
            className={cn(
              'text-base font-medium truncate',
              isCodeM && 'text-emerald-700 dark:text-emerald-300 font-mono',
              isTypeM && 'text-stone-800 dark:text-stone-100',
              !isCodeM && !isTypeM && 'text-primary-foreground'
            )}
          >
            {character.name}
          </h2>
          <p
            className={cn(
              'text-xs truncate',
              isCodeM && 'text-emerald-500 dark:text-emerald-600 font-mono opacity-100',
              isTypeM && 'text-amber-700 dark:text-amber-300 opacity-100',
              !isCodeM && !isTypeM && 'text-primary-foreground/80 opacity-90'
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
              className={cn(
                'h-10 w-10 rounded-full',
                isCodeM && 'text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
                isTypeM && 'text-amber-800 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-900/50',
                !isCodeM && !isTypeM && 'text-primary-foreground hover:bg-white/10 dark:hover:bg-white/10'
              )}
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
