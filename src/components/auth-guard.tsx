'use client';

import { useAuth } from '@/contexts/auth-context';
import LoginPage from '@/components/login-page';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading EmotiVerse…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
