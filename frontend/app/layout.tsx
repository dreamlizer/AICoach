import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { PreferencesProvider } from '@/context/preferences-context'
import { AuthProvider } from '@/context/auth-context'
import { LanguageProvider } from '@/context/language-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Coach',
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
            <PreferencesProvider>
              {children}
            </PreferencesProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
