'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ImageIcon,
  Zap,
  Heart,
  Smile,
  MessageCircle,
  Sparkles,
  Users,
  Palette,
} from 'lucide-react';
import { defaultPersonas } from '@/config/personas';

interface DashFrame {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  headline: string;
  subtext: string;
  chips?: string[];
}

const dashFrames: DashFrame[] = [
  {
    icon: Palette,
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/50',
    border: 'border-violet-200 dark:border-violet-800/50',
    label: 'Personas',
    headline: 'Pick your vibe.',
    subtext: 'Switch between tones: empathetic, joyful, curious, calm, romantic, or keep it neutral. Mahad adapts to how you want to talk.',
    chips: ['Empathetic', 'Joyful', 'Romantic', 'Curious', 'Calm'],
  },
  {
    icon: Mic,
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    border: 'border-rose-200 dark:border-rose-800/50',
    label: 'Voice',
    headline: 'Talk it out.',
    subtext: 'Record your message and get spoken replies. Perfect when you want to chat hands-free or hear Mahad’s voice.',
    chips: ['Record', 'TTS', 'Hands-free'],
  },
  {
    icon: ImageIcon,
    color: 'text-fuchsia-700 dark:text-fuchsia-300',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
    border: 'border-fuchsia-200 dark:border-fuchsia-800/50',
    label: 'Image',
    headline: 'Photos & generate.',
    subtext: 'Send a photo with a caption or ask Mahad to generate images. Visual conversation, your way.',
    chips: ['Upload', 'Caption', 'Generate'],
  },
  {
    icon: Zap,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800/50',
    label: 'Personality',
    headline: 'Bold & direct.',
    subtext: 'Mahad keeps it real with high energy and enthusiasm. No fluff — straight talk when you need it.',
    chips: ['Bold', 'Direct', 'High-energy'],
  },
  {
    icon: Sparkles,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    border: 'border-violet-300/50 dark:border-violet-700/50',
    label: 'Your partner',
    headline: 'One Mahad, many moods.',
    subtext: 'Chat, voice, or images — with the persona you choose. Your conversation partner, tailored to you.',
    chips: ['Chat', 'Voice', 'Image'],
  },
];

const stats = [
  { icon: MessageCircle, value: 'Personas', label: defaultPersonas.length + ' tones' },
  { icon: Mic, value: 'Voice', label: 'Record & TTS' },
  { icon: ImageIcon, value: 'Image', label: 'Send or generate' },
];

export default function MahadDashboard() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(
      () => setCurrentFrame((p) => (p + 1) % dashFrames.length),
      3600
    );
    return () => clearInterval(id);
  }, [isPaused]);

  const frame = dashFrames[currentFrame];
  const FrameIcon = frame.icon;

  return (
    <div ref={sectionRef} className="relative w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-[130%] rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute right-1/2 top-10 h-36 w-36 translate-x-[140%] rounded-full bg-rose-500/15 blur-3xl dark:bg-rose-500/20" />
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] [background-image:linear-gradient(rgba(139,92,246,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.25)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>
      <div className="relative flex flex-col items-center gap-5 w-full py-2">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 dark:bg-violet-500/20 border border-violet-400/30 dark:border-violet-600/40 px-4 py-1.5">
          <Heart className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-[11px] font-semibold tracking-widest text-violet-700 dark:text-violet-300 uppercase">
            Mahad · Chat, voice & image
          </span>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1 px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Your AI{' '}
            <span className="bg-gradient-to-r from-violet-500 to-rose-500 dark:from-violet-400 dark:to-rose-400 text-transparent bg-clip-text">
              conversation partner.
            </span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
            Bold, direct, and high-energy. Pick a persona and talk, type, or send images.
          </p>
        </div>

        {/* Card */}
        <div
          className="w-1/2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.008}px, ${(mousePosition.y - 50) * 0.008}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative rounded-2xl bg-white dark:bg-[#0f0a14] border border-violet-200/60 dark:border-violet-900/50 shadow-[0_4px_24px_rgba(139,92,246,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Top bar */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-violet-100 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/30">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 border border-violet-200/60 dark:border-violet-800/40">
                  <Smile className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-violet-700 dark:text-violet-300 font-bold">
                  Mahad
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-gray-600 dark:text-slate-400 font-medium">Online</span>
              </div>
            </div>

            {/* Rotating content */}
            <div className="relative h-[220px] overflow-hidden bg-white dark:bg-[#0f0a14]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFrame}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 p-5 flex flex-col items-center justify-center gap-3 text-center w-full"
                >
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${frame.color}`}>
                    {frame.label}
                  </span>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${frame.bg} border ${frame.border}`}
                  >
                    <FrameIcon className={`w-6 h-6 ${frame.color}`} />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.06 }}
                    className="text-lg font-bold text-gray-900 dark:text-white leading-snug"
                  >
                    {frame.headline}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-[260px]"
                  >
                    {frame.subtext}
                  </motion.p>
                  {frame.chips && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.16 }}
                      className="flex flex-wrap justify-center gap-1.5"
                    >
                      {frame.chips.map((chip, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium ${frame.bg} border ${frame.border} ${frame.color}`}
                        >
                          {chip}
                        </span>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
              {/* Subtle gradient bars */}
              <div className="absolute bottom-0 left-0 right-0 h-6 flex items-end gap-0.5 px-5 pb-2 opacity-10 dark:opacity-5">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 12, 24, 10][i % 5] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', delay: i * 0.06 }}
                    className="w-full bg-violet-500 dark:bg-violet-400 rounded-t-sm"
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-violet-100 dark:border-violet-900/50 bg-violet-50/30 dark:bg-violet-950/20">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-violet-600 dark:text-violet-500" />
                <span className="text-[9px] uppercase tracking-wider text-violet-700 dark:text-violet-400 font-semibold">
                  {defaultPersonas.length} personas
                </span>
              </div>
              <div className="flex gap-1">
                {dashFrames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentFrame(i);
                      setIsPaused(true);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      currentFrame === i ? 'w-4 bg-violet-600 dark:bg-violet-500' : 'w-1 bg-violet-300/50 dark:bg-violet-700/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-violet-500/5 dark:bg-violet-500/10 border border-violet-400/20 dark:border-violet-600/30 px-3 py-1.5"
            >
              <s.icon className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">{s.value}</span>
              <span className="text-[11px] text-gray-500 dark:text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Online pill */}
        <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2">
          <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Mahad is online</span>
          <div className="flex gap-0.5 ml-0.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-violet-500 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
