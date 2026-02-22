import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Attendee – Eventhantering',
  description: 'Eventhantering och deltagarregistrering',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="antialiased">{children}</body>
    </html>
  )
}
