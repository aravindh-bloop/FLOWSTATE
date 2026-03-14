import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FLOWSTATE — Redefine Human Performance',
  description:
    'Precision chronobiology coaching for high-stakes performance. A structured 90-day protocol that rebuilds your biological architecture, reclaims your peak cognitive window, and installs a sustainable identity of excellence.',
  keywords: ['performance coaching', 'chronobiology', 'productivity', 'biohacking', 'flow state', 'deep work', 'cognitive performance'],
  openGraph: {
    title: 'FLOWSTATE — Redefine Human Performance',
    description: 'Precision chronobiology coaching for high-stakes performance.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`scroll-smooth ${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
