/**
 * @file app/layout.tsx
 * @description Root layout for the Finance-Dealer application.
 * Configures global fonts, metadata, viewport settings, and provides the application 
 * structure including the Navbar and GuestModeContext provider.
 */

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { GuestModeProvider } from '@/context/GuestModeContext';

/**
 * Configure Geist Sans font for the primary application UI.
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

/**
 * Configure Geist Mono font for financial figures and code snippets.
 */
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Mobile-responsive viewport and theme color settings.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

/**
 * Global SEO and application metadata.
 */
export const metadata: Metadata = {
  title: 'Nepali Personal Finance & NEPSE OS',
  description: 'A lightweight personal finance app for tracking salary, monthly expenses, and NEPSE stock portfolios.',
};

/**
 * Root component that wraps all pages.
 * Integrates GuestModeProvider for ephemeral state management and renders the sticky Navbar.
 * 
 * @param props - RootLayout children components.
 */
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
