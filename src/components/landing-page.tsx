'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MessageCircle,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
} from 'lucide-react';

// ─── Animation helpers ─────────────────────────────────────────────────────────
function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const features = [
  {
    image: '/features/personas.png',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Emotional Personas',
    desc: 'Each AI adapts its tone — playful, serious, warm, or witty — based on the persona you select. No generic replies.',
  },
  {
    image: '/features/voice.png',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Voice & Audio',
    desc: "Send voice messages, hear replies spoken back. Real conversations, not just text on a screen.",
  },
  {
    image: '/features/image.png',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10 border-fuchsia-500/20',
    title: 'Image Understanding',
    desc: 'Share photos and get meaningful reactions — ask questions, get descriptions, or just share a moment.',
  },
  {
    image: '/features/memory.png',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'Context Memory',
    desc: 'Remembers your conversation as you go. References what you said earlier, just like a real person would.',
  },
  {
    image: '/features/instant.png',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Instant Responses',
    desc: 'Streaming replies arrive word-by-word so conversations feel live, reactive, and never make you wait.',
  },
  {
    image: '/features/code.png',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Code Intelligence',
    desc: 'Code M, powered by Codestral-22B, handles code reviews, debugging, and engineering questions like a senior dev.',
  },
];

const characters = [
  {
    name: 'Sara',
    emoji: '💜',
    gradient: 'from-violet-600 to-fuchsia-600',
    glow: 'shadow-violet-500/30',
    border: 'border-violet-500/30',
    tag: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    role: 'Your Emotional Anchor',
    desc: 'Warm, empathetic, and deeply human. Sara listens, reflects, and responds with genuine care.',
    traits: ['Empathetic', 'Supportive', 'Warm'],
  },
  {
    name: 'Mahad',
    emoji: '💚',
    gradient: 'from-emerald-600 to-teal-600',
    glow: 'shadow-emerald-500/30',
    border: 'border-emerald-500/30',
    tag: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    role: 'Your Energetic Friend',
    desc: 'Bold, direct, and high-energy. Mahad keeps it real and brings enthusiasm to every conversation.',
    traits: ['Bold', 'Direct', 'Energetic'],
  },
  {
    name: 'Code M',
    emoji: '🖥️',
    gradient: 'from-teal-600 to-cyan-600',
    glow: 'shadow-teal-500/30',
    border: 'border-teal-500/30',
    tag: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    role: 'Your AI Engineer',
    desc: 'Powered by Codestral-22B. Reviews your code, explains concepts, and helps you ship faster.',
    traits: ['Codestral-22B', '~72% HumanEval', 'Multi-language'],
  },
];

const steps = [
  {
    n: '01',
    title: 'Choose Your Character',
    desc: 'Pick Sara, Mahad, or Code M — each brings a completely different personality and expertise.',
  },
  {
    n: '02',
    title: 'Set the Tone',
    desc: 'Select a persona to shape how they speak — casual, formal, playful, direct. You decide the vibe.',
  },
  {
    n: '03',
    title: 'Just Talk',
    desc: 'Type, send a voice message, or share an image. The conversation flows naturally, just like with a real person.',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleCTA = () => router.push('/login');

  useEffect(() => {
    // The global CSS locks html/body overflow:hidden for the chat app.
    // Override it here so the landing page can scroll normally.
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';

    // Force dark mode class and background color so no white shows through
    const html = document.documentElement;
    const body = document.body;
    const hadDark = html.classList.contains('dark');
    const oldBg = body.style.backgroundColor;

    if (!hadDark) html.classList.add('dark');
    body.style.backgroundColor = '#07090f';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (!hadDark) html.classList.remove('dark');
      body.style.backgroundColor = oldBg;
    };
  }, []);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Scroll to features
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">

      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-xl bg-[#07090f]/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="EmotiVerse" width={36} height={36} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-white">EmotiVerse</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <button onClick={scrollToFeatures} className="hover:text-white transition-colors">Features</button>
          <button onClick={() => document.getElementById('characters')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Characters</button>
          <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">How it works</button>
        </nav>
        <button
          onClick={handleCTA}
          className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 font-semibold text-sm px-5 py-2 hover:bg-gray-100 transition-colors"
        >
          Sign In <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-xs font-semibold tracking-widest text-gray-300 uppercase">AI Characters. Real Emotions.</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight"
          >
            Conversations that{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 text-transparent bg-clip-text">
              feel human.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed"
          >
            EmotiVerse gives you AI companions with real personality — warm, bold, or brilliantly technical.
            Chat, voice, images. Your conversation. Your vibe.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={handleCTA}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-8 py-3.5 text-base transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium px-8 py-3.5 text-base transition-all"
            >
              See how it works
            </button>
          </motion.div>

          {/* Video card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl mt-4"
          >
            {/* Glow behind card - slightly deeper for cinematic feel */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-600/40 via-fuchsia-600/20 to-transparent blur-2xl" />

            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black flex flex-col">
              {/* Main Wrapper with equal vertical padding for cinematic bars */}
              <div className="relative w-full py-14 flex flex-col items-center justify-center">
                
                {/* Browser chrome bar - Absolutely positioned within the top bar space */}
                <div className="absolute top-0 inset-x-0 h-14 flex items-center gap-3 px-6 z-20">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">System Status: Online</span>
                  </div>
                  <div className="h-3 w-[1px] bg-white/10 mx-1" />
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">EmotiVerse Preview</span>
                  <div className="ml-auto flex items-center gap-4 opacity-40">
                    <span className="text-[9px] text-gray-400 font-mono tabular-nums uppercase tracking-tighter">LOC: 34.0522° N, 118.2437° W</span>
                    <span className="text-[9px] text-gray-400 font-mono tracking-tighter uppercase">v1.0.4-STABLE</span>
                  </div>
                </div>

                {/* Video container - Guaranteed aspect-video for perfect fit */}
                <div className="w-full relative aspect-video">
                  <video
                    ref={videoRef}
                    src="/intro.mp4"
                    poster="/intro.gif"
                    loop
                    playsInline
                    autoPlay
                    muted={isMuted}
                    className="w-full h-full object-cover"
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                  />
                  
                  {/* Video Controls Overlay (Bottom Right) */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 z-30">
                    <button
                      onClick={handlePlayVideo}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all"
                    >
                      {videoPlaying ? (
                        <Pause className="w-4 h-4 text-white fill-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={handleMuteToggle}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Main Play overlay */}
                  {!videoPlaying && (
                    <button
                      onClick={handlePlayVideo}
                      className="absolute inset-0 flex items-center justify-center group z-20"
                    >
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all group-hover:scale-110">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Scroll cue */}
          <motion.button
            onClick={scrollToFeatures}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors mt-2"
          >
            <span className="text-xs tracking-widest uppercase">Explore</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </motion.button>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 md:px-12 max-w-6xl mx-auto">
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-fuchsia-400 mb-3">What you get</p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Built for real{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-rose-400 text-transparent bg-clip-text">human-feeling</span>
            {' '}chat
          </h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg">
            Every feature is designed to close the gap between talking to an AI and talking to a person.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            return (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className="h-full rounded-2xl bg-white/3 border border-white/8 hover:border-white/15 hover:bg-white/5 transition-all p-6 flex flex-col gap-3 group">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-white mt-0.5">{f.title}</h3>
                    <div className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border ${f.bg} overflow-hidden bg-black/20`}>
                      <Image 
                        src={f.image} 
                        alt={f.title} 
                        width={36} 
                        height={36} 
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </section>

      {/* ─── Characters ──────────────────────────────────────────────────────── */}
      <section id="characters" className="py-28 px-6 md:px-12 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-violet-400 mb-3">Meet the team</p>
            <h2 className="text-4xl md:text-5xl font-bold">
              Three characters.{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 text-transparent bg-clip-text">
                Infinite conversations.
              </span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {characters.map((c, i) => (
              <FadeUp key={c.name} delay={i * 0.1}>
                <div className={`relative h-full rounded-3xl bg-[#0e1117] border ${c.border} overflow-hidden group hover:shadow-2xl ${c.glow} transition-all duration-500 p-7 flex flex-col gap-5`}>
                  {/* Gradient bg */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  {/* Avatar */}
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-3xl shadow-lg`}>
                    {c.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-2 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{c.role}</p>
                    <h3 className="text-2xl font-bold text-white">{c.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
                  </div>

                  {/* Traits */}
                  <div className="flex flex-wrap gap-2">
                    {c.traits.map((t) => (
                      <span key={t} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.tag}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <section id="how" className="py-28 px-6 md:px-12 max-w-4xl mx-auto">
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">Simple by design</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            Up and talking in{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text">
              30 seconds.
            </span>
          </h2>
        </FadeUp>

        <div className="flex flex-col gap-6">
          {steps.map((s, i) => (
            <FadeUp key={s.n} delay={i * 0.12}>
              <div className="flex items-start gap-6 p-6 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/5 transition-all">
                <span className="flex-shrink-0 text-4xl font-black text-transparent bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text leading-none pt-1">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12">
        <FadeUp>
          <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden">
            {/* Gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-700" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEG0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

            <div className="relative px-10 py-16 text-center flex flex-col items-center gap-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">Free to try · No credit card</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Ready to feel the difference?
              </h2>
              <p className="text-white/70 text-lg max-w-lg">
                Join EmotiVerse and start having conversations that actually feel like something.
              </p>

              <button
                onClick={handleCTA}
                className="group inline-flex items-center gap-2 rounded-full bg-white text-gray-900 font-bold px-10 py-4 text-base hover:bg-gray-100 transition-all shadow-2xl hover:scale-105"
              >
                Start Talking Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 md:px-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="EmotiVerse" width={28} height={28} className="rounded-md opacity-80" />
          <span className="text-sm text-gray-500 font-medium">EmotiVerse</span>
        </div>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} EmotiVerse. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-gray-500">
          <span className="cursor-default">Privacy</span>
          <span className="cursor-default">Terms</span>
          <span className="cursor-default">Contact</span>
        </div>
      </footer>

    </div>
  );
}
