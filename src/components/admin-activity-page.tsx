'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, setDoc, where, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { characters } from '@/config/characters';
import { ADMIN_EMAIL } from '@/config/admin';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, UserCircle } from 'lucide-react';

interface ActivityUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string | null;
  updatedAt: string | null;
  isTracked: boolean;
}

interface ActivityLogMessage {
  role: 'user' | 'ai';
  text: string;
}

interface ActivityLog {
  id: string;
  timestamp: string | null;
  characterId: string;
  persona?: string | null;
  messages: ActivityLogMessage[];
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function characterNameFromId(id: string): string {
  const match = characters.find((c) => c.id === id);
  return match?.name ?? id;
}

export function AdminActivityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ActivityUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isAdmin || !db) return;
    let cancelled = false;
    setUsersLoading(true);
    setUsersError(null);
    getDocs(collection(db, 'users'))
      .then((snap) => {
        if (cancelled) return;
        const list: ActivityUser[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const email = (d.email ?? '').toString().trim();
          const toIso = (v: unknown) => {
            if (!v) return null;
            if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
              return (v as { toDate: () => Date }).toDate().toISOString();
            }
            return String(v);
          };
          return {
            id: docSnap.id,
            name: (d.name ?? '').toString(),
            email,
            phone: (d.phone ?? '').toString(),
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt),
            isTracked: d.tracked === true,
          };
        });
        setUsers(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setUsersError(err instanceof Error ? err.message : 'Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const setUserTracked = async (userId: string, tracked: boolean) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'users', userId), { tracked }, { merge: true });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isTracked: tracked } : u)));
      toast({ title: tracked ? 'Tracking enabled' : 'Tracking disabled', variant: 'default' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast({ title: 'Could not update tracked', description: msg, variant: 'destructive' });
    }
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!isAdmin || !db || !selectedUser?.email) {
      setLogs([]);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);
    const q = query(
      collection(db, 'activity_logs'),
      where('email', '==', selectedUser.email),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        const list: ActivityLog[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          let timestamp: string | null = null;
          const t = d.timestamp;
          if (t && typeof t === 'object' && 'toDate' in t && typeof (t as { toDate: () => Date }).toDate === 'function') {
            timestamp = (t as { toDate: () => Date }).toDate().toISOString();
          } else if (t) timestamp = String(t);
          return {
            id: docSnap.id,
            timestamp,
            characterId: (d.characterId ?? '').toString(),
            persona: d.persona ?? null,
            messages: Array.isArray(d.messages) ? d.messages.map((m: { role: string; text: string }) => ({ role: m.role, text: m.text })) : [],
          };
        });
        setLogs(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLogsError(err instanceof Error ? err.message : 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, selectedUser?.email]);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
          <p className="text-sm text-muted-foreground">You are not authorized to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-tight">User activity overview</h2>
        <p className="text-xs text-muted-foreground">
          Internal view only. Lists all users and highlights tracked accounts. Click a user to see detailed
          session activity and tones.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <div className="w-full md:w-1/3 rounded-lg border border-border bg-background/60 p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Users ({users.length})
            </p>
          </div>
          <div className="h-[260px] md:h-[calc(100%-1.75rem)]">
            {usersLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : usersError ? (
              <div className="flex h-full items-center justify-center px-3 text-xs text-destructive">
                {usersError}
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-full items-center justify-center px-3 text-xs text-muted-foreground">
                No users found.
              </div>
            ) : (
              <ScrollArea className="h-full pr-1">
                <div className="space-y-1.5">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors',
                        'hover:bg-muted/70',
                        u.isTracked && (selectedUserId === u.id ? 'border-amber-500 bg-amber-500/15' : 'border-amber-500/60 bg-amber-500/10'),
                        !u.isTracked && (selectedUserId === u.id ? 'border-primary bg-primary/5' : 'border-border bg-background/40')
                      )}
                    >
                      <button
                        type="button"
                        className="flex flex-1 min-w-0 items-center gap-2 text-left"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          u.isTracked ? 'bg-amber-500/20' : 'bg-primary/10'
                        )}>
                          <UserCircle className={cn('h-4 w-4', u.isTracked ? 'text-amber-600 dark:text-amber-400' : 'text-primary')} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium">{u.name || '—'}</span>
                            {u.isTracked && (
                              <Badge variant="outline" className="shrink-0 border-amber-500/70 bg-amber-500/10 text-[10px]">
                                Tracked
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">{u.email || '—'}</p>
                          <p className="truncate text-[10px] text-muted-foreground/80">
                            {u.phone || '—'}
                          </p>
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-7 text-[10px] px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserTracked(u.id, !u.isTracked);
                        }}
                      >
                        {u.isTracked ? 'Untrack' : 'Track'}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="w-full md:flex-1 rounded-lg border border-border bg-background/60 p-3 shadow-sm">
          {!selectedUser ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium">Select a user to view activity</p>
              <p className="text-xs text-muted-foreground">
                Tracked users are marked with a badge. Activity includes tones/personas and text-only messages.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{selectedUser.name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedUser.email || '—'}</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Joined {formatDateTime(selectedUser.createdAt)} · Updated {formatDateTime(selectedUser.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUser.isTracked && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/80 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      Tagged / Tracked
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant={selectedUser.isTracked ? 'outline' : 'default'}
                    size="sm"
                    className="text-[10px]"
                    onClick={() => setUserTracked(selectedUser.id, !selectedUser.isTracked)}
                  >
                    {selectedUser.isTracked ? 'Untrack' : 'Track'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={logsLoading}
                    onClick={() => {
                      // Re-trigger logs fetch by resetting selection
                      setSelectedUserId((id) => (id ? `${id}` : id));
                    }}
                  >
                    {logsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-[11px]">Refresh</span>
                    )}
                  </Button>
                </div>
              </div>

              {logsLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : logsError ? (
                <div className="flex flex-1 items-center justify-center px-3 text-xs text-destructive">
                  {logsError}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 text-xs text-muted-foreground">
                  No activity logs for this user yet.
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3 pb-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-md border border-border bg-background/80 p-2.5 text-xs shadow-sm"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-medium">
                              {characterNameFromId(log.characterId)}{' '}
                              <span className="text-[10px] text-muted-foreground">({log.characterId})</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDateTime(log.timestamp)}
                            </p>
                          </div>
                          {log.persona ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/70 bg-emerald-500/10 px-1.5 py-0 text-[10px]"
                            >
                              Tone: {log.persona}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          {log.messages.map((m, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'rounded-md px-2 py-1.5',
                                m.role === 'user'
                                  ? 'bg-slate-950/40 text-slate-50'
                                  : 'bg-slate-900/40 text-slate-100'
                              )}
                            >
                              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                {m.role === 'user' ? 'User' : 'AI'}
                              </p>
                              <p className="whitespace-pre-wrap text-[11px] leading-snug">
                                {m.text || '(empty)'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

