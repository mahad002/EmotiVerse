'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^\+?[\d\s\-()]+$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type RegisterData = z.infer<typeof registerSchema>;

const googleProvider = new GoogleAuthProvider();

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ─── Input component ──────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white ' +
        'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ' +
        'transition-all duration-200 ' +
        (props.className ?? '')
      }
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Login form
  const {
    register: loginReg,
    handleSubmit: handleLogin,
    formState: { errors: loginErr },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  // Register form
  const {
    register: regReg,
    handleSubmit: handleRegister,
    formState: { errors: regErr },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  // ── Helpers ──────────────────────────────────────────────────────────
  function firebaseErrorMessage(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account already exists with this email.',
      'auth/weak-password': 'Password is too weak.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] ?? 'Something went wrong. Please try again.';
  }

  async function saveUserProfile(
    uid: string,
    data: { name: string; phone: string; email: string }
  ) {
    await setDoc(
      doc(db, 'users', uid),
      { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  const onLogin = handleLogin(async ({ email, password }) => {
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      toast({ title: 'Sign-in failed', description: firebaseErrorMessage(code), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const onRegister = handleRegister(async ({ name, phone, email, password }) => {
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await saveUserProfile(cred.user.uid, { name, phone, email });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      toast({ title: 'Registration failed', description: firebaseErrorMessage(code), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  });

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Merge with existing profile: never overwrite saved name/phone
      const existingSnap = await getDoc(doc(db, 'users', user.uid));
      const existing = existingSnap.exists() ? (existingSnap.data() as { name?: string; phone?: string }) : {};
      const savedName = (existing.name ?? '').toString().trim();
      const savedPhone = (existing.phone ?? '').toString().trim();
      await setDoc(
        doc(db, 'users', user.uid),
        {
          name: savedName || user.displayName || '',
          phone: savedPhone,
          email: user.email ?? '',
          ...(existingSnap.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Google sign-in failed', description: firebaseErrorMessage(code), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (!auth || !db) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0b0f1a]">
        <p className="text-center text-slate-400 max-w-sm">
          Firebase is not configured. On Vercel: add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_APP_ID in Project Settings → Environment Variables, then redeploy. Locally: add them to .env and restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0b0f1a]">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
      </div>

      <div
        className="relative z-10 w-full max-w-md mx-4 my-8"
        style={{ animation: 'splash-content-in 0.5s ease-out' }}
      >
        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                EmotiVerse
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {mode === 'login' ? 'Welcome back 👋' : 'Create your account'}
            </p>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="relative mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or continue with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* ── LOGIN form ──────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={onLogin} className="flex flex-col gap-4">
              <Field label="Email" error={loginErr.email?.message}>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...loginReg('email')}
                />
              </Field>
              <Field label="Password" error={loginErr.password?.message}>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...loginReg('password')}
                />
              </Field>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── REGISTER form ────────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={onRegister} className="flex flex-col gap-4">
              <Field label="Full Name" error={regErr.name?.message}>
                <Input
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  {...regReg('name')}
                />
              </Field>
              <Field label="Phone Number" error={regErr.phone?.message}>
                <Input
                  type="tel"
                  placeholder="+1 555 000 1234"
                  autoComplete="tel"
                  {...regReg('phone')}
                />
              </Field>
              <Field label="Email" error={regErr.email?.message}>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...regReg('email')}
                />
              </Field>
              <Field label="Password" error={regErr.password?.message}>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  {...regReg('password')}
                />
              </Field>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Toggle */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                New to EmotiVerse?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
