'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ExhibitorRow {
  id: string
  company_name: string
  email: string | null
  booth_number: string | null
  status: 'draft' | 'published'
  edit_token: string
  offers: { id: string }[]
}

export default function ExhibitorList({
  eventId,
  exhibitors: initial,
  appUrl,
}: {
  eventId: string
  exhibitors: ExhibitorRow[]
  appUrl: string
}) {
  const [exhibitors, setExhibitors] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ company_name: '', email: '', booth_number: '' })
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/exhibitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Kunde inte skapa utställare.')
        return
      }
      setExhibitors((prev) => [...prev, { ...data.exhibitor, offers: [], redemptions: [] }])
      setForm({ company_name: '', email: '', booth_number: '' })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Är du säker på att du vill ta bort denna utställare?')) return
    const res = await fetch(`/api/exhibitors/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setExhibitors((prev) => prev.filter((e) => e.id !== id))
    }
  }

  async function copyInviteLink(exhibitor: ExhibitorRow) {
    const link = `${appUrl}/exhibitor/${exhibitor.edit_token}`
    await navigator.clipboard.writeText(link)
    setCopiedId(exhibitor.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function sendInvite(exhibitor: ExhibitorRow) {
    if (!exhibitor.email) return
    const res = await fetch(`/api/exhibitors/${exhibitor.id}/invite`, { method: 'POST' })
    if (res.ok) alert(`Inbjudan skickad till ${exhibitor.email}`)
    else alert('Kunde inte skicka inbjudan.')
  }

  return (
    <div>
      {/* Lägg till-knapp */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Lägg till utställare
        </button>
      )}

      {/* Formulär */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 max-w-lg"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Ny utställare</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Företagsnamn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="Företag AB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-post (för inbjudan)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="kontakt@foretag.se"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monternummer</label>
              <input
                type="text"
                value={form.booth_number}
                onChange={(e) => setForm((f) => ({ ...f, booth_number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="A12"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Sparar...' : 'Lägg till'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {exhibitors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-gray-500">Inga utställare ännu. Lägg till den första!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Företag</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Monter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Erbjudande</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exhibitors.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{ex.company_name}</p>
                    {ex.email && <p className="text-xs text-gray-400 mt-0.5">{ex.email}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{ex.booth_number ?? '–'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ex.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ex.status === 'published' ? 'Publicerad' : 'Utkast'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {ex.offers.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        🎁 Erbjudande
                      </span>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => copyInviteLink(ex)}
                        title="Kopiera inbjudningslänk"
                        className="text-xs text-gray-500 hover:text-brand px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        {copiedId === ex.id ? '✓ Kopierad' : '🔗 Länk'}
                      </button>
                      {ex.email && (
                        <button
                          onClick={() => sendInvite(ex)}
                          title="Skicka inbjudan"
                          className="text-xs text-gray-500 hover:text-brand px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          ✉️ Skicka
                        </button>
                      )}
                      <Link
                        href={`/dashboard/events/${eventId}/exhibitors/${ex.id}`}
                        className="text-xs text-brand hover:opacity-70 px-2 py-1 rounded hover:bg-brand/10 transition-colors"
                      >
                        Redigera
                      </Link>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Ta bort
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
