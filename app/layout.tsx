import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { GuestModeProvider } from '@/context/GuestModeContext';

/**
 * App-wide root layout. Wraps every page in GuestModeProvider (so guest-mode
 * data is available anywhere) and renders the persistent Navbar above the
 * page content. overflow-x-hidden on the body is a safety net against
 * unexpected horizontal overflow; the actual fix for content fitting mobile
 * screens should happen at the component level (see components/Navbar.tsx).
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export const metadata: Metadata = {
  title: 'Nepali Personal Finance & NEPSE OS',
  description: 'A lightweight personal finance app for tracking salary, monthly expenses, and NEPSE stock portfolios.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
        <GuestModeProvider>
          <Navbar />
          <div className="flex-1 w-full max-w-full overflow-x-hidden">{children}</div>
        </GuestModeProvider>
      </body>
    </html>
  );
}
