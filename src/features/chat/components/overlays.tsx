'use client';

import { RefObject } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ProfileSettingsPage } from '@/components/profile-settings-page';
import type { Character } from '@/config/characters';

export interface ChatOverlaysProps {
  isProfileSheetOpen: boolean;
  onProfileSheetOpenChange: (open: boolean) => void;
  profileSheetTab: 'profile' | 'settings';
  onAfterSignOut: () => void;
  mainContentRef: RefObject<HTMLDivElement | null>;
  viewingImageSrc: string | null;
  onViewingImageSrcChange: (src: string | null) => void;
  isViewContactOpen: boolean;
  onViewContactOpenChange: (open: boolean) => void;
  selectedCharacter: Character | null;
}

export function ChatOverlays({
  isProfileSheetOpen,
  onProfileSheetOpenChange,
  profileSheetTab,
  onAfterSignOut,
  mainContentRef,
  viewingImageSrc,
  onViewingImageSrcChange,
  isViewContactOpen,
  onViewContactOpenChange,
  selectedCharacter,
}: ChatOverlaysProps) {
  return (
    <>
      <Sheet open={isProfileSheetOpen} onOpenChange={onProfileSheetOpenChange}>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md flex flex-col p-0"
          aria-describedby="profile-settings-description"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            mainContentRef.current?.focus();
          }}
        >
          <SheetHeader className="px-6 pt-6 pb-2 border-b border-border">
            <SheetTitle>Profile & Settings</SheetTitle>
            <SheetDescription id="profile-settings-description">
              View your profile and manage app settings.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6">
            <ProfileSettingsPage
              key={profileSheetTab}
              defaultTab={profileSheetTab}
              onAfterSignOut={onAfterSignOut}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewingImageSrc} onOpenChange={(open) => !open && onViewingImageSrcChange(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-2 border-0 bg-black/40 shadow-none overflow-visible [&>button]:bg-white/90 [&>button]:text-black [&>button]:rounded-full">
          {viewingImageSrc && (
            <img
              src={viewingImageSrc}
              alt=""
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewContactOpen} onOpenChange={onViewContactOpenChange}>
        <DialogContent className="sm:max-w-md">
          {selectedCharacter && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {selectedCharacter.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-lg">{selectedCharacter.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCharacter.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
