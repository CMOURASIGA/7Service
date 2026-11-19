import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Access Management Service',
  description: 'Painel administrativo interno da Consult Services',
  icons: {
    icon: [{ url: '/product-icons/access-management-service.svg', type: 'image/svg+xml' }],
    shortcut: '/product-icons/access-management-service.svg',
    apple: '/product-icons/access-management-service.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="bg-background text-foreground flex min-h-full flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
