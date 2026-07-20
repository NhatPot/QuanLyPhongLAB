import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'LHU IT LAB',
  description: 'Hệ thống quản lý phòng Lab CNTT',
  icons: {
    icon: [
      {
        url: '/branding/lhu-favicon-v3.png',
        type: 'image/png',
        sizes: '64x64',
      },
    ],
    shortcut: '/branding/lhu-favicon-v3.png',
    apple: '/branding/lhu-symbol.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
