import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { PreferencesProvider } from '@/context/preferences-context'
import { AuthProvider } from '@/context/auth-context'
import { LanguageProvider } from '@/context/language-context'
import { DynamicTitle } from '@/app/components/DynamicTitle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '高管内参',
  description: 'AI Partner for Strategy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
