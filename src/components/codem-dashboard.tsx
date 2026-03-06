'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Cpu, Zap, GitBranch, Terminal, CheckCircle2, Users } from 'lucide-react';

// ─── Rotating frames ───────────────────────────────────────────────────────────
interface DashFrame {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  headline: string;
  subtext: string;
  chips?: string[];
}

const dashFrames: DashFrame[] = [
  {
    icon: Cpu,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border border-emerald-500/20',
    label: 'Powered By',
    headline: 'Codestral-22B',
    subtext: '22B parameter open coding model — one of the highest performers on HumanEval, scoring ~70–75%.',
    chips: ['22B params', '~72% HumanEval', 'Apache 2.0'],
  },
  {
    icon: Code2,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10 border border-teal-500/20',
    label: 'What Code M Does',
    headline: 'Code. Debug. Explain.',
    subtext: 'Ask Code M to write, review, or fix code in any language. It thinks like a senior engineer.',
    chips: ['Python', 'TypeScript', 'Rust', 'SQL'],
  },
  {
    icon: GitBranch,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10 border border-cyan-500/20',
    label: 'Built For Speed',
    headline: 'Instant Code Context.',
    subtext: 'Fill in the middle, complete functions, and understand entire codebases — all in real time.',
  },
];

// ─── Stats ─────────────────────────────────────────────────────────────────────
const stats = [
  { icon: Cpu,          value: '22B',  label: 'Parameters'    },
  { icon: CheckCircle2, value: '~72%', label: 'HumanEval'     },
  { icon: Zap,          value: 'FIM',  label: 'Fill-in-Middle' },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function HeroDashboard() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPaused, setIsPaused]         = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width)  * 100,
        y: ((e.clientY - rect.top)  / rect.height) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() =>
      setCurrentFrame(p => (p + 1) % dashFrames.length), 3200);
    return () => clearInterval(id);
  }, [isPaused]);

  const frame     = dashFrames[currentFrame];
  const FrameIcon = frame.icon;

  return (
    <div ref={sectionRef} className="relative w-full">
      <div className="flex flex-col items-center gap-5 w-full py-2">

        {/* ── Eyebrow ───────────────────────────────────────────────────── */}
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5">
          <Terminal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-semibold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase">
            Code M · Codestral-22B
          </span>
        </div>

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="text-center space-y-1 px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Your AI{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 text-transparent bg-clip-text">
              Coding Partner.
            </span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
            Powered by Codestral-22B — one of the best open coding models available.
          </p>
        </div>

        {/* ── Animated mockup card ──────────────────────────────────────── */}
        <div
          className="w-full max-w-sm mx-auto px-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.01}px, ${(mousePosition.y - 50) * 0.01}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Glow */}
          <div className="absolute inset-x-0 mx-auto h-40 w-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none" />

          {/* Card */}
          <div className="relative rounded-[28px] bg-white dark:bg-[#0a0f0d] border border-emerald-200 dark:border-emerald-900/40 shadow-[0_8px_40px_rgba(16,185,129,0.1)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Browser bar */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-emerald-100 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                <span className="ml-2.5 text-[9px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-700 font-bold">
                  Code M · Codestral
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-semibold">Ready</span>
              </div>
            </div>

            {/* Rotating content — fixed height so card never resizes */}
            <div className="relative h-[220px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFrame}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 p-5 flex flex-col items-center justify-center gap-3 text-center w-full"
                >
                  {/* Label */}
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 font-semibold">
                    {frame.label}
                  </span>

                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1,    opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${frame.bg}`}
                  >
                    <FrameIcon className={`w-6 h-6 ${frame.color}`} />
                  </motion.div>

                  {/* Headline */}
                  <motion.h3
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.08 }}
                    className="text-xl font-bold text-gray-900 dark:text-white leading-snug"
                  >
                    {frame.headline}
                  </motion.h3>

                  {/* Subtext */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.14 }}
                    className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-[240px]"
                  >
                    {frame.subtext}
                  </motion.p>

                  {/* Chips */}
                  {frame.chips && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.22 }}
                      className="flex flex-wrap justify-center gap-1.5"
                    >
                      {frame.chips.map((chip, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${frame.bg} ${frame.color}`}
                        >
                          {chip}
                        </span>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Chart bars — sits below the fixed area */}
              <div className="h-7 flex items-end gap-0.5 opacity-[0.12] dark:opacity-[0.08] w-full px-5 pb-3">
                {[...Array(18)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [12, 28, 18, 34, 16][i % 5] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.07 }}
                    className="w-full bg-emerald-500 dark:bg-emerald-400 rounded-t-sm"
                  />
                ))}
              </div>
            </div>

            {/* Status bar */}
            <div className="px-5 py-2.5 flex items-center justify-between border-t border-emerald-100 dark:border-white/5 bg-emerald-50/80 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5">
                <Code2 className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                <span className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-bold">
                  Codestral-22B
                </span>
              </div>
              <div className="flex gap-1">
                {dashFrames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentFrame(i); setIsPaused(true); }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      currentFrame === i
                        ? 'w-4 bg-emerald-500'
                        : 'w-1 bg-emerald-300/40 dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat pills ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5"
            >
              <s.icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{s.value}</span>
              <span className="text-[11px] text-gray-500 dark:text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Online pill ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2">
          <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Code M is online</span>
          <div className="flex gap-0.5 ml-0.5">
            {[0, 1].map(i => (
              <span key={i} className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
