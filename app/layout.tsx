import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/specific/landing/Header';
import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Footer } from '@/components/shared/footer/Footer';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'LinkLite',
    description:
        'LinkLite is an URL shortener which allows users to shorten out a long link and also view some accessibility related stats',
    icons: [
        { rel: 'icon', url: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning className="scroll-smooth">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Header />
                    {children}
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
