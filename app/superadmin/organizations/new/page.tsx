'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    orgName: '',
    orgSlug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => {
      const updated = { ...prev, [name]: value }
      // Auto-generate slug from org name
      if (name === 'orgName') {
        updated.orgSlug = value
          .toLowerCase()
          .replace(/[åä]/g, 'a')
          .replace(/ö/g, 'o')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Något gick fel.')
        return
      }

      router.push('/superadmin')
      router.refresh()
    } catch {
      setError('Nätverksfel. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/superadmin"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Tillbaka
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Skapa organisation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Skapar en ny organisation och en ägaranvändare.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organisation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Organisation</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="orgName"
              value={form.orgName}
              onChange={handleChange}
              required
              placeholder="Exempelförbundet"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="orgSlug"
              value={form.orgSlug}
              onChange={handleChange}
              required
              placeholder="exempelforbundet"
              pattern="[a-z0-9-]+"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Endast gemener, siffror och bindestreck.</p>
          </div>
        </div>

        {/* Ägaranvändare */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Ägaranvändare</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="adminName"
              value={form.adminName}
              onChange={handleChange}
              required
              placeholder="Anna Svensson"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-post <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="adminEmail"
              value={form.adminEmail}
              onChange={handleChange}
              required
              placeholder="anna@example.se"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lösenord <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="adminPassword"
              value={form.adminPassword}
              onChange={handleChange}
              required
              minLength={8}
              placeholder="Minst 8 tecken"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Skapar...' : 'Skapa organisation'}
          </button>
          <Link
            href="/superadmin"
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  )
}
