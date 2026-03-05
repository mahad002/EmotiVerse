'use client';

import Image from 'next/image';

const INSPIROVIX_LOGO =
  'https://inspirovix.s3.us-east-2.amazonaws.com/Inspirovix+-+11.png';

const MIN_DURATION_MS = 2200;

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6"
      aria-label="Loading Emotiverse"
    >
      {/* Logo: center crop — top and bottom cropped, left/right visible */}
      <div className="relative h-[min(38vw,260px)] w-[min(85vw,380px)] shrink-0 overflow-hidden rounded-2xl shadow-lg">
        <Image
          src={INSPIROVIX_LOGO}
          alt="Inspirovix"
          fill
          className="object-cover object-center"
          priority
          sizes="(max-width: 768px) 70vw, 320px"
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-1">
        <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Emotiverse
        </p>
        <p className="text-sm text-muted-foreground">by Inspirovix</p>
      </div>

      <div className="mt-10 h-1.5 w-40 overflow-hidden rounded-full bg-muted sm:w-52">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            animation: `splash-progress ${MIN_DURATION_MS}ms ease-out forwards`,
          }}
        />
      </div>
    </div>
  );
}
