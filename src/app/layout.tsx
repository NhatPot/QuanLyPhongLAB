import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'LHU IT LAB',
  description: 'Hệ thống quản lý phòng Lab CNTT',
  icons: {
    icon: [
      {
        url: '/branding/lhu-official-favicon.ico?v=1.1.2',
        type: 'image/x-icon',
        sizes: '16x16',
      },
    ],
    shortcut: '/branding/lhu-official-favicon.ico?v=1.1.2',
    apple: '/branding/lhu-symbol.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
