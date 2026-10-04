/**
 * @file app/layout.tsx
 * @description Root layout for the Finance-Dealer application.
 * Configures global fonts, metadata, viewport settings, and provides the application
 * structure including the Navbar, Footer, and GuestModeContext provider.
 */

import type { Metadata, Viewport } from 'next';
import { Geist, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GuestModeProvider } from '@/context/GuestModeContext';

/**
 * Geist Sans — headings, mastheads, and body prose. See DESIGN.md §2.
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

/**
 * IBM Plex Mono — every figure, ticker, date, and currency code. Real tabular
 * numerals, with the mechanical character of a printed statement.
 */
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Mobile-responsive viewport and theme color settings.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f3' },
    { media: '(prefers-color-scheme: dark)', color: '#18181a' },
  ],
};

/**
 * Global SEO and application metadata.
 */
export const metadata: Metadata = {
  title: 'Nepali Personal Finance & NEPSE OS | FinanceDealer',
  description:
    'A personal account book for Nepal — salary, monthly expenses, savings goals, and NEPSE portfolio tracking, kept in rupees and lakhs.',
};

/**
 * Root component that wraps all pages.
 * Integrates GuestModeProvider for ephemeral state management, sticky Navbar, and Footer.
 *
 * @param props - RootLayout children components.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${plexMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <GuestModeProvider>
          <Navbar />
          <div className="flex-1 w-full max-w-full overflow-x-hidden">{children}</div>
          <Footer />
        </GuestModeProvider>
      </body>
    </html>
  );
}
