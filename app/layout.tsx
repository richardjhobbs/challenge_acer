import '../styles/globals.css';
import type { ReactNode } from 'react';

const metadataBase = new URL(
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
);

export const metadata = {
  metadataBase,
  title: 'Acer Challenge',
  description: 'Pick your numbers, reveal the tiles, reveal the target, then the clock auto-starts after 10 seconds.',
  icons: {
    icon: [
      { url: '/images/acer-can-winner-logo.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/acer-can-winner-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/acer-can-winner-logo.png', sizes: '48x48', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/acer-can-winner-logo.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/images/acer-can-winner-logo.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/images/acer-can-winner-logo.png" sizes="48x48" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <a className="siteLogo" href="/" aria-label="Acer Challenge home">
          <img
            className="headerLogo"
            src="/images/acer-can-winner-logo.png"
            alt="Acer Challenge logo"
            loading="eager"
          />
        </a>
        {children}
      </body>
    </html>
  );
}
