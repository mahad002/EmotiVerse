'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Brain, Smile, MessageCircle, Star, Users } from 'lucide-react';

// ─── Rotating frames ───────────────────────────────────────────────────────────
interface DashFrame {
  icon: React.ElementType;
  color: string;
  bg: string;
  headline: string;
  subtext: string;
  bullets?: string[];
}

const dashFrames: DashFrame[] = [
  {
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    headline: 'Your Feelings Matter.',
    subtext: 'EmotiVerse is built around you — not just your words, but your emotions.',
  },
  {
    icon: Brain,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    headline: 'Personas That Adapt.',
    subtext: 'Choose from 8 emotional personas — empathetic, romantic, playful and more.',
    bullets: ['Empathetic Listener', 'Romantic Partner', 'Joyful Companion'],
  },
  {
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    headline: 'Voice. Images. Memory.',
    subtext: 'Rich multi-modal conversations that feel genuinely alive, every session.',
  },
];

// ─── Stats ─────────────────────────────────────────────────────────────────────
const stats = [
  { icon: Smile,          label: '8 Personas'        },
  { icon: MessageCircle,  label: 'Unlimited chats'   },
  { icon: Star,           label: '24/7 Available'    },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function EmotiDashboard() {
  const [frame, setFrame]   = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setFrame(f => (f + 1) % dashFrames.length), 3200);
    return () => clearInterval(id);
  }, [paused]);

  const current    = dashFrames[frame];
  const FrameIcon  = current.icon;

  return (
    <div className="flex flex-col items-center gap-6 w-full py-1">

      {/* ── Eyebrow ─────────────────────────────────────────────────────── */}
      <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5">
        <Heart className="w-3 h-3 text-violet-400" />
        <span className="text-[11px] font-semibold tracking-widest text-violet-400 uppercase">
          Emotional AI Companions
        </span>
      </div>

      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1 px-4">
        <h2 className="text-3xl font-bold text-white leading-tight">
          Feel Understood.{' '}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 text-transparent bg-clip-text">
            Every Time.
          </span>
        </h2>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          AI companions that listen, adapt, and care — with voice, images & memory.
        </p>
      </div>

      {/* ── Animated mockup card ────────────────────────────────────────── */}
      <div
        className="w-full max-w-sm mx-auto px-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Glow */}
        <div className="absolute inset-x-0 mx-auto h-40 w-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        {/* Card */}
        <div className="relative rounded-[28px] bg-[#0d1117] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Browser bar */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400/80" />
              <span className="h-2 w-2 rounded-full bg-amber-400/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              <span className="ml-2.5 text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                EmotiVerse
              </span>
            </div>
            <div className="h-3.5 w-24 rounded-full bg-white/5" />
          </div>

          {/* Rotating content */}
          <div className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-[200px] max-h-[250px] p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={frame}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center gap-2.5 text-center w-full"
              >
                {/* Icon bubble */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl border ${current.bg}`}
                >
                  <FrameIcon className={`w-5 h-5 ${current.color}`} />
                </motion.div>

                {/* Headline */}
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-lg font-bold text-white leading-snug"
                >
                  {current.headline}
                </motion.h3>

                {/* Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="text-xs text-slate-400 leading-relaxed max-w-[220px]"
                >
                  {current.subtext}
                </motion.p>

                {/* Bullets */}
                {current.bullets && (
                  <div className="flex flex-wrap justify-center gap-1.5 w-full">
                    {current.bullets.map((b, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.25 + i * 0.07 }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${current.color.replace('text-', 'bg-')}`} />
                        {b}
                      </motion.span>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Chart bars decoration */}
            <div className="h-8 flex items-end gap-0.5 opacity-[0.1] mt-2">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [14, 30, 20, 36, 18][i % 5] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatType: 'reverse', delay: i * 0.08 }}
                  className="w-full bg-violet-400 rounded-t-sm"
                />
              ))}
            </div>
          </div>

          {/* Status bar */}
          <div className="px-5 py-2.5 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">Live</span>
            </div>
            {/* Dot indicators */}
            <div className="flex gap-1">
              {dashFrames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFrame(i); setPaused(true); }}
                  className={`h-1 rounded-full transition-all duration-400 ${
                    frame === i ? 'w-4 bg-violet-500' : 'w-1 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat pills ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5"
          >
            <s.icon className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] font-medium text-slate-300 whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Characters online ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
        <Users className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-slate-300">3 companions ready</span>
        <div className="flex gap-0.5 ml-0.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
