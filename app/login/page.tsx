'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Fel e-post eller lösenord. Försök igen.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('Något gick fel. Kontrollera e-postadressen och försök igen.')
      setLoading(false)
    } else {
      setResetSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">Attendee</h1>
          <p className="text-gray-500 mt-2">Eventhantering &amp; deltagarregistrering</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Logga in</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="du@example.se"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-lg py-2.5 px-4 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loggar in...' : 'Logga in'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null) }}
                  className="w-full text-sm text-indigo-600 hover:text-indigo-800 text-center"
                >
                  Glömt lösenord?
                </button>
              </form>
            </>
          ) : resetSent ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-4">📬</p>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Kolla din e-post</h2>
              <p className="text-sm text-gray-600 mb-6">
                Vi har skickat en länk till <strong>{email}</strong> för att återställa ditt lösenord.
              </p>
              <button
                onClick={() => { setMode('login'); setResetSent(false) }}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ← Tillbaka till inloggning
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Återställ lösenord</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ange din e-post så skickar vi en återställningslänk.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="du@example.se"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-lg py-2.5 px-4 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Skickar...' : 'Skicka återställningslänk'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null) }}
                  className="w-full text-sm text-indigo-600 hover:text-indigo-800 text-center"
                >
                  ← Tillbaka till inloggning
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
