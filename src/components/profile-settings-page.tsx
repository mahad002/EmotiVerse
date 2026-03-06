'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { User, Settings as SettingsIcon, ActivitySquare, ExternalLink } from 'lucide-react';
import { SettingsContent } from '@/components/settings-content';
import { cn } from '@/lib/utils';
import { ADMIN_EMAIL } from '@/config/admin';

interface UserProfile {
  name?: string;
  phone?: string;
  email?: string;
}

interface ProfileSettingsPageProps {
  /** Initial tab when opened (e.g. from avatar = profile, from settings button = settings) */
  defaultTab?: 'profile' | 'settings';
  /** Called after sign out so parent can close sheet */
  onAfterSignOut?: () => void;
}

export function ProfileSettingsPage({
  defaultTab = 'profile',
  onAfterSignOut,
}: ProfileSettingsPageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? (snap.data() as UserProfile) : {});
      })
      .catch(() => {
        if (!cancelled) setProfile({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const name = (profile?.name ?? user?.displayName ?? '').toString().trim() || '—';
  const email = (profile?.email ?? user?.email ?? '').toString().trim() || '—';
  const phone = (profile?.phone ?? '').toString().trim() || '—';

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className={cn('mb-4 grid w-full', isAdmin ? 'grid-cols-3' : 'grid-cols-2')}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Settings
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <ActivitySquare className="h-4 w-4" />
              Activity
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="flex-1 overflow-y-auto mt-0 focus-visible:outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {name !== '—' ? name.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-0.5">
                  <p className="text-lg font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</span>
                  <span className="text-sm">{name}</span>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                  <span className="text-sm truncate">{email}</span>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</span>
                  <span className="text-sm">{phone}</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-y-auto mt-0 focus-visible:outline-none">
          <SettingsContent onAfterSignOut={onAfterSignOut} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0 focus-visible:outline-none">
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <ActivitySquare className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Activity overview</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  View all users and tracked activity (tones, messages) on a full page.
                </p>
              </div>
              <Link
                href="/app/activity"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open activity overview
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
