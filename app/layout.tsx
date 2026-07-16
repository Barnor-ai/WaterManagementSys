import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { CurrencyProvider } from '@/lib/currency-context';
import { CompanyProvider } from '@/lib/company-context';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AquaFlow ERP — Water Manufacturing Management System',
  description: 'Enterprise water manufacturing management: production, inventory, sales, warehouse, and financials in real time.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'AquaFlow ERP',
    description: 'Enterprise Water Manufacturing Management System',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <CurrencyProvider>
            <CompanyProvider>
              <AuthProvider>{children}</AuthProvider>
            </CompanyProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
