'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun, Mic, RefreshCw, Volume2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  KOKORO_LANGUAGES,
  KOKORO_VOICES,
  TTS_VOICE_STORAGE_KEY,
} from '@/config/tts-voices';

const MIC_STORAGE_KEY = 'emotiverse_mic_device_id';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MicDevice {
  deviceId: string;
  label: string;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micLoading, setMicLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [ttsLang, setTtsLang] = useState<string>('default');
  const [ttsGender, setTtsGender] = useState<string>('f');
  const [ttsVoiceId, setTtsVoiceId] = useState<string>('af');

  const loadStoredMic = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(MIC_STORAGE_KEY);
      if (stored) setSelectedMicId(stored);
    } catch {
      // ignore
    }
  }, []);

  const loadStoredTtsVoice = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(TTS_VOICE_STORAGE_KEY);
      if (stored && KOKORO_VOICES.some((v) => v.id === stored)) {
        setTtsVoiceId(stored);
        const voice = KOKORO_VOICES.find((v) => v.id === stored);
        if (voice) {
          setTtsLang(voice.lang === 'default' ? 'default' : voice.lang);
          setTtsGender(voice.gender);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const genderOptions = useMemo(() => {
    if (ttsLang === 'default') return [];
    const voices = KOKORO_VOICES.filter((v) => v.lang === ttsLang);
    const genders = new Set(voices.map((v) => v.gender));
    const opts: { value: string; label: string }[] = [];
    if (genders.has('f')) opts.push({ value: 'f', label: 'Female' });
    if (genders.has('m')) opts.push({ value: 'm', label: 'Male' });
    return opts;
  }, [ttsLang]);

  const voiceOptions = useMemo(() => {
    if (ttsLang === 'default') {
      return KOKORO_VOICES.filter((v) => v.lang === 'default');
    }
    let list = KOKORO_VOICES.filter((v) => v.lang === ttsLang);
    if (ttsGender && ttsGender !== 'mixed') {
      list = list.filter((v) => v.gender === ttsGender);
    }
    return list;
  }, [ttsLang, ttsGender]);

  const refreshMicList = useCallback(async () => {
    setMicError(null);
    setMicLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` }));
      setMics(audioInputs);
      loadStoredMic();
      if (audioInputs.length > 0 && !selectedMicId) {
        const stored = localStorage.getItem(MIC_STORAGE_KEY);
        if (stored && audioInputs.some((m) => m.deviceId === stored)) {
          setSelectedMicId(stored);
        }
      }
    } catch (e) {
      setMicError(e instanceof Error ? e.message : 'Could not access microphones');
      setMics([]);
    } finally {
      setMicLoading(false);
    }
  }, [loadStoredMic, selectedMicId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && open) {
      loadStoredMic();
      loadStoredTtsVoice();
      if (mics.length === 0 && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        refreshMicList();
      }
    }
  }, [mounted, open, loadStoredMic, loadStoredTtsVoice, refreshMicList]);

  const handleMicChange = (value: string) => {
    setSelectedMicId(value);
    try {
      if (value) localStorage.setItem(MIC_STORAGE_KEY, value);
      else localStorage.removeItem(MIC_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleTtsLangChange = (value: string) => {
    setTtsLang(value);
    if (value === 'default') {
      setTtsVoiceId('af');
      setTtsGender('f');
      try {
        localStorage.setItem(TTS_VOICE_STORAGE_KEY, 'af');
      } catch {
        // ignore
      }
      return;
    }
    const voices = KOKORO_VOICES.filter((v) => v.lang === value);
    const firstGender = voices[0]?.gender ?? 'f';
    setTtsGender(firstGender);
    const filtered = voices.filter((v) => v.gender === firstGender);
    const firstVoice = filtered[0]?.id ?? voices[0]?.id ?? 'af_bella';
    setTtsVoiceId(firstVoice);
    try {
      localStorage.setItem(TTS_VOICE_STORAGE_KEY, firstVoice);
    } catch {
      // ignore
    }
  };

  const handleTtsGenderChange = (value: string) => {
    setTtsGender(value);
    const list = KOKORO_VOICES.filter(
      (v) => v.lang === ttsLang && v.gender === value
    );
    const first = list[0]?.id ?? 'af_bella';
    setTtsVoiceId(first);
    try {
      localStorage.setItem(TTS_VOICE_STORAGE_KEY, first);
    } catch {
      // ignore
    }
  };

  const handleTtsVoiceChange = (value: string) => {
    setTtsVoiceId(value);
    try {
      if (value) localStorage.setItem(TTS_VOICE_STORAGE_KEY, value);
      else localStorage.removeItem(TTS_VOICE_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (!mounted) {
    return null;
  }

  const currentTheme = theme || 'system';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your application preferences
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <Select value={currentTheme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System Default</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark Theme</span>
                  </div>
                </SelectItem>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light Theme</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Microphone
            </label>
            <p className="text-xs text-muted-foreground">
              STT: browser speech recognition (default mic) or Whisper when a mic is selected. Voice input uses the selected device when set; otherwise browser default. Click Refresh to list devices.
            </p>
            <div className="flex gap-2">
              <Select value={selectedMicId || 'default'} onValueChange={(v) => handleMicChange(v === 'default' ? '' : v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default microphone</SelectItem>
                  {mics.map((m) => (
                    <SelectItem key={m.deviceId} value={m.deviceId}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={refreshMicList}
                disabled={micLoading}
                aria-label="Refresh microphone list"
              >
                <RefreshCw className={micLoading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
              </Button>
            </div>
            {micError && <p className="text-xs text-destructive">{micError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              TTS voice (Kokoro)
            </label>
            <p className="text-xs text-muted-foreground">
              Language, gender, and voice for AI speech. Used when the AI responds in voice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Language</label>
                <Select value={ttsLang} onValueChange={handleTtsLangChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {KOKORO_LANGUAGES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {genderOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Gender</label>
                  <Select value={ttsGender} onValueChange={handleTtsGenderChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn('space-y-1', ttsLang === 'default' && 'sm:col-span-2')}>
                <label className="text-xs text-muted-foreground">Voice</label>
                <Select value={ttsVoiceId} onValueChange={handleTtsVoiceChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Account / Sign Out */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">Account</label>
            {user && (
              <p className="text-xs text-muted-foreground truncate">
                Signed in as <span className="font-medium">{user.email}</span>
              </p>
            )}
            <Button
              type="button"
              variant="destructive"
              className="w-full flex items-center gap-2"
              onClick={async () => { await signOut(); onOpenChange(false); }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

