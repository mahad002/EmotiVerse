
import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProviders from '@/components/app-providers';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/use-auth';

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

export const metadata: Metadata = {
  title: 'TalkMate',
  description: 'Explore conversations with TalkMate AI.',
  icons: {
    icon: 'https://inspirovix.s3.us-east-2.amazonaws.com/Inspirovix+-+11.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          openSans.variable
        )}
      >
        <AppProviders>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}

    