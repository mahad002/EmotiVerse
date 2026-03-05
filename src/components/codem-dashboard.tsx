'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Users,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';

// ─── Dashboard frames (rotating content) ─────────────────────────────────────
interface DashFrame {
  headline: string[];
  subtext: string;
  bullets?: string[];
  icon: React.ElementType;
}

const dashFrames: DashFrame[] = [
  {
    icon: Heart,
    headline: ['Emotion Isn\'t a Bug.', 'It\'s the Feature.'],
    subtext: 'EmotiVerse lets you talk the way you actually feel.',
  },
  {
    icon: MessageCircle,
    headline: ['AI That Understands You — End to End'],
    subtext:
      'Your AI companions adapt in real time to your tone, mood, and context.',
  },
  {
    icon: Sparkles,
    headline: ['Real Presence. Real Connection.'],
    subtext: 'Built for conversations that actually mean something.',
    bullets: ['8 emotional personas', 'Voice + image support', 'Always online, always listening'],
  },
];

// ─── Stat cards (left column) ─────────────────────────────────────────────────
const stats = [
  { value: '8', label: 'Emotional personas' },
  { value: '24/7', label: 'Always available' },
  { value: 'Voice', label: 'Speech in & out' },
];

// ─── Floating badges (top-right decorations) ──────────────────────────────────
const floatingBadges = [
  { icon: Shield, text: 'Private & Secure', delay: '0s', position: 'top-16 right-6' },
  { icon: TrendingUp, text: 'Emotionally Aware', delay: '0.5s', position: 'top-36 right-28' },
  { icon: Zap, text: 'Instant Response', delay: '1s', position: 'bottom-28 right-10' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroDashboard() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  // Parallax on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-rotate frames
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % dashFrames.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const frame = dashFrames[currentFrame];
  const FrameIcon = frame.icon;

  return (
    <div ref={sectionRef} className="relative w-full">
      {/* ── Floating badges (hidden on small screens) ─────────────────────── */}
      <div className="hidden xl:block absolute inset-0 z-10 pointer-events-none">
        {floatingBadges.map((badge, index) => (
          <div
            key={index}
            className={`absolute ${badge.position} animate-float`}
            style={{ animationDelay: badge.delay }}
          >
            <div className="backdrop-blur-md bg-white/80 dark:bg-slate-800/80 rounded-2xl px-4 py-3 shadow-xl border border-gray-200/50 dark:border-white/10 flex items-center gap-2 hover:scale-110 transition-transform duration-300">
              <badge.icon className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {badge.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16">

        {/* ── Left: Hero copy + stat cards ────────────────────────────────── */}
        <div className="space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
              Emotional AI
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            <span className="block text-gray-900 dark:text-white mb-1">
              Conversations That{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 text-transparent bg-clip-text">
                Feel Real.
              </span>
            </span>
            <span className="block text-gray-900 dark:text-white">
              Connection That{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 text-transparent bg-clip-text">
                Lasts.
              </span>
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed">
            Choose a character, pick a persona, and experience AI conversations
            with genuine emotional depth — with voice, images, and memory.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/30 transition-transform duration-300 hover:scale-[1.05]">
              <span>Start Chatting</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Stat cards row */}
          <div className="flex items-center gap-4 pt-2">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="backdrop-blur-md bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-lg w-28 h-24 flex flex-col justify-center px-4"
              >
                <div className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 text-transparent bg-clip-text">
                  {stat.value}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium leading-snug">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Animated Dashboard Mockup ────────────────────────────── */}
        <div
          className="relative mt-4 lg:mt-0"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.015}px, ${(mousePosition.y - 50) * 0.015}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Glow behind card */}
          <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 blur-3xl scale-110" />

          {/* Dashboard container */}
          <div className="relative mx-auto max-w-md rounded-[32px] bg-slate-50 dark:bg-slate-950 p-[1px] shadow-[0_40px_120px_rgba(0,0,0,0.18)] dark:shadow-[0_40px_120px_rgba(52,211,153,0.08)] backdrop-blur-xl border border-white/20 dark:border-white/5 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">

            {/* Browser chrome bar */}
            <div className="mx-3 mt-3 h-9 rounded-2xl bg-white/40 dark:bg-slate-900 px-4 flex items-center justify-between shadow-sm border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/80" />
                <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold">
                  EmotiVerse
                </span>
              </div>
              <div className="h-4 w-28 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            </div>

            {/* Animated content area */}
            <div className="m-3 mb-4 rounded-[24px] bg-white dark:bg-slate-900 p-8 shadow-inner border border-white/20 dark:border-white/5 min-h-[300px] flex items-center justify-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFrame}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 p-8 flex flex-col items-center justify-center"
                >
                  <div className="text-center space-y-5 w-full">
                    {/* Frame icon */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 border border-emerald-500/20"
                    >
                      <FrameIcon className="w-6 h-6 text-emerald-500" />
                    </motion.div>

                    {/* Headlines */}
                    <div className="space-y-1">
                      {frame.headline.map((line, i) => (
                        <motion.h3
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * i, ease: 'easeOut' }}
                          className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight"
                        >
                          {line}
                        </motion.h3>
                      ))}
                    </div>

                    {/* Subtext */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
                      className="text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed"
                    >
                      {frame.subtext}
                    </motion.p>

                    {/* Bullets (frame 3 only) */}
                    {frame.bullets && (
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {frame.bullets.map((bullet, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-slate-800 border border-emerald-100/60 dark:border-white/10"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {bullet}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Decorative animated chart bars at bottom */}
              <div className="absolute bottom-6 left-8 right-8 h-10 flex items-end justify-between gap-1 opacity-[0.15]">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [20, 40, 30, 45, 25][i % 5] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      delay: i * 0.1,
                    }}
                    className="w-full bg-emerald-400 rounded-t-sm"
                  />
                ))}
              </div>
            </div>

            {/* Status / dot indicator bar */}
            <div className="mx-6 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                  Online
                </span>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1">
                {[...Array(dashFrames.length)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentFrame(i); setIsPaused(true); }}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      currentFrame === i
                        ? 'w-4 bg-emerald-500'
                        : 'w-1 bg-gray-300/40 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Users online pill */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-white/10 shadow-lg px-4 py-2">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              2 characters online
            </span>
            <span className="flex gap-0.5">
              {[0, 1].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
