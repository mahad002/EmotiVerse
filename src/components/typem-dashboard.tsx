'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Mail, BookOpen, PenLine, CheckCircle2, PenTool, Users } from 'lucide-react';

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
    icon: Mail,
    color: 'text-amber-800 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/50',
    label: 'Letters & emails',
    headline: 'Clear, ready to send.',
    subtext: 'Professional emails and letters. We get your intent, then draft so you can edit and send.',
    chips: ['Professional', 'Friendly', 'Concise'],
  },
  {
    icon: FileText,
    color: 'text-stone-700 dark:text-stone-300',
    bg: 'bg-stone-50 dark:bg-stone-900/40',
    border: 'border-stone-200 dark:border-stone-700/50',
    label: 'Docs & reports',
    headline: 'Structure first, then fill in.',
    subtext: 'Outlines turn into full sections. Each part is written and reviewed for clarity and tone.',
    chips: ['Outline', 'Sections', 'Review'],
  },
  {
    icon: BookOpen,
    color: 'text-amber-900 dark:text-amber-200',
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    border: 'border-amber-200/80 dark:border-amber-800/40',
    label: 'Essays & longer pieces',
    headline: 'From idea to finished draft.',
    subtext: 'Themes, arguments, and structure. We adapt to formal, academic, or casual style.',
    chips: ['Formal', 'Academic', 'Casual'],
  },
];

const stats = [
  { icon: PenTool, value: 'Draft', label: 'Section by section' },
  { icon: CheckCircle2, value: 'Review', label: 'Grammar & tone' },
  { icon: FileText, value: 'Export', label: 'Plain text ready' },
];

export default function TypeMDashboard() {
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
      3800
    );
    return () => clearInterval(id);
  }, [isPaused]);

  const frame = dashFrames[currentFrame];
  const FrameIcon = frame.icon;

  return (
    <div ref={sectionRef} className="relative w-full">
      {/* Subtle paper texture overlay (noise) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative flex flex-col items-center gap-5 w-full py-2">
        {/* Eyebrow — pen + writing vibe */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-stone-900/80 border border-amber-200/80 dark:border-amber-800/40 shadow-sm px-4 py-1.5">
          <PenLine className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span className="text-[11px] font-semibold tracking-widest text-amber-800 dark:text-amber-300 uppercase">
            Type M · Writing & research
          </span>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1 px-4">
          <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
            Your AI{' '}
            <span className="text-amber-800 dark:text-amber-200">writing partner.</span>
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
            Letters, essays, docs — we draft, you refine.
          </p>
        </div>

        {/* Card — paper sheet look */}
        <div
          className="w-1/2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.008}px, ${(mousePosition.y - 50) * 0.008}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative rounded-2xl bg-[#fefdfb] dark:bg-stone-900/90 border border-amber-200/60 dark:border-amber-900/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Top bar — like letterhead */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/40">
                  <PenLine className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-300 font-bold">
                  Type M
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-stone-600 dark:text-stone-400 font-medium">Ready to write</span>
              </div>
            </div>

            {/* Rotating content */}
            <div className="relative h-[220px] overflow-hidden bg-[#fefdfb] dark:bg-stone-900/50">
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
                    className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug"
                  >
                    {frame.headline}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-[260px]"
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
              {/* Decorative ruled lines (paper feel) */}
              <div className="absolute bottom-0 left-0 right-0 h-8 flex flex-col justify-end gap-px px-5 pb-2 opacity-20 dark:opacity-10">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-px bg-stone-400 dark:bg-stone-500" />
                ))}
              </div>
            </div>

            {/* Footer — page vibe */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-amber-100 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5">
                <PenLine className="w-3 h-3 text-amber-600 dark:text-amber-500" />
                <span className="text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
                  Writing partner
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
                      currentFrame === i ? 'w-4 bg-amber-600 dark:bg-amber-500' : 'w-1 bg-amber-300/50 dark:bg-stone-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stat pills — ink/paper style */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-white dark:bg-stone-800/80 border border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5 shadow-sm"
            >
              <s.icon className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">{s.value}</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Online pill */}
        <div className="flex items-center gap-2 rounded-full bg-white dark:bg-stone-800/80 border border-amber-200/50 dark:border-amber-800/30 px-4 py-2 shadow-sm">
          <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Type M is online</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
