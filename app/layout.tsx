import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Acer Challenge',
  description: 'Pick your numbers, reveal the tiles, reveal the target, then the clock auto-starts after 10 seconds.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
