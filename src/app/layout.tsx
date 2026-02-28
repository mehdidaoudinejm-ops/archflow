import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ArchFlow — Gestion de projet pour architectes d\'intérieur',
  description:
    'Digitalisez vos DPGF, gérez vos appels d\'offres et suivez vos chantiers depuis une seule plateforme.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
