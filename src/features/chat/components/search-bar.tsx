'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, X } from 'lucide-react';

export interface ChatSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function ChatSearchBar({ value, onChange, onClose, placeholder = 'Search in this chat...' }: ChatSearchBarProps) {
  return (
    <div className="bg-white dark:bg-[#1f2c34] border-b border-gray-200 dark:border-[#2a3942] px-4 py-2 flex items-center gap-2 flex-shrink-0">
      <SearchIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 bg-[#f0f2f5] dark:bg-[#2a3942] border-0 text-sm"
        autoFocus
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label="Close search"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
