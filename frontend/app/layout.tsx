import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { PreferencesProvider } from '@/context/preferences-context'
import { AuthProvider } from '@/context/auth-context'
import { LanguageProvider } from '@/context/language-context'
import { DynamicTitle } from '@/app/components/DynamicTitle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.executiveinsider.top'),
  title: '高管AI内参',
  description: 'AI Partner for Strategy',
  openGraph: {
    title: '高管AI内参',
    description: '你的24/7私人决策智库',
    url: 'https://www.executiveinsider.top',
    siteName: '高管AI内参',
    images: [
      {
        url: '/share-icon.png', // Must be an absolute URL in production, but metadataBase handles it
        width: 300,
        height: 300,
        alt: '高管AI内参',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  icons: {
    icon: '/logo2.png',
    apple: '/share-icon.png', // Fallback for some platforms
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'none', visibility: 'hidden', height: 0, width: 0, overflow: 'hidden' }}>
          {/* WeChat Share Image Hack */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/share-icon.png" alt="logo" />
        </div>
        <AuthProvider>
          <LanguageProvider>
            <DynamicTitle />
            <PreferencesProvider>
              {children}
            </PreferencesProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
