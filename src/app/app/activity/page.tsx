'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { AdminActivityPage } from '@/components/admin-activity-page';
import { ADMIN_EMAIL } from '@/config/admin';
import { useAuth } from '@/contexts/auth-context';
import { ChevronLeft } from 'lucide-react';

export default function ActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (loading || !user) return;
    if (!isAdmin) router.replace('/app');
  }, [loading, user, isAdmin, router]);

  return (
    <AuthGuard>
      {!loading && user && !isAdmin ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
            <Link
              href="/app"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to app
            </Link>
          </header>
          <main className="min-h-0 flex-1 overflow-auto p-4">
            <AdminActivityPage />
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
