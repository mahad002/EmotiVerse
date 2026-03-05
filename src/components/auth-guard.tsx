'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import CompleteProfileDialog from '@/components/complete-profile-dialog';

interface UserProfile {
  name?: string;
  phone?: string;
  email?: string;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  useEffect(() => {
    if (!user || !db) {
      setProfileLoading(false);
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.exists() ? (snap.data() as UserProfile) : {};
        setProfile(data);
        const name = (data.name ?? user.displayName ?? '').toString().trim();
        const phone = (data.phone ?? '').toString().trim();
        setShowCompleteProfile(!name || !phone);
      })
      .catch(() => {
        if (!cancelled) setProfile({});
        setShowCompleteProfile(true);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading EmotiVerse…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-sm text-slate-400">Redirecting…</p>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {user && (
        <CompleteProfileDialog
          open={showCompleteProfile}
          userId={user.uid}
          initialName={(profile?.name ?? user.displayName ?? '').toString().trim()}
          initialEmail={(profile?.email ?? user.email ?? '').toString().trim()}
          onSaved={() => setShowCompleteProfile(false)}
        />
      )}
    </>
  );
}
