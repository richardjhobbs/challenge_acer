import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Acer Challenge',
  description: 'Pick your numbers, reveal the tiles, reveal the target, then the clock auto-starts after 10 seconds.',
  icons: {
    icon: '/images/acer-can-winner-logo.png',
    apple: '/images/acer-can-winner-logo.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="siteLogo" href="/" aria-label="Acer Challenge home">
          <img src="/images/acer-can-winner-logo.png" alt="Acer Challenge" />
        </a>
        {children}
      </body>
    </html>
  );
}
