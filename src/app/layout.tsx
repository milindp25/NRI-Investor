import type { Metadata } from 'next';
import { Playfair_Display, Outfit } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NRI Investment Calculator — Compare Returns Across Borders',
  description:
    'Live rates for US CDs, Savings, Indian NRE/NRO/FCNR Fixed Deposits. Compare real returns after tax and forex for NRI investors.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${playfair.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
