'use client';

import { useEffect, useState } from 'react';
import SplashScreen from './splash-screen';

const SPLASH_DURATION_MS = 2200;
const FADE_OUT_MS = 400;

export default function SplashWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSplashLeaving(true);
      const t2 = setTimeout(() => {
        setShowSplash(false);
      }, FADE_OUT_MS);
      return () => clearTimeout(t2);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showSplash && (
        <div
          className="fixed inset-0 z-[100] transition-opacity duration-[400ms] ease-out"
          style={{ opacity: splashLeaving ? 0 : 1 }}
          aria-hidden={splashLeaving}
        >
          <SplashScreen />
        </div>
      )}
      <div
        className="min-h-full w-full"
        style={{
          animation: showSplash ? 'none' : 'splash-content-in 0.4s ease-out',
        }}
      >
        {children}
      </div>
    </>
  );
}
