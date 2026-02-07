import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Acer Challenge',
  description: 'Pick your numbers, reveal the tiles, reveal the target, then the clock auto-starts after 10 seconds.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
