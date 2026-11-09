import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'HexaBlock Agent Factory' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
