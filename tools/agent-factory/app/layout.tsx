import type { ReactNode } from 'react';

export const metadata = { title: 'HexaBlock Agent Factory' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: '0 auto', maxWidth: 960, padding: 16 }}>{children}</body>
    </html>
  );
}
