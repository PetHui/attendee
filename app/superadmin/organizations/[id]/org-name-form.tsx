'use client'

import { useState } from 'react'

export default function OrgNameForm({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || name.trim() === initialName) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), orgId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Något gick fel.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Organisationsuppgifter</h2>
      <div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || name.trim() === initialName}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          {saved && <p className="text-sm text-green-600 mt-1">Namnet sparades.</p>}
        </div>
      </div>
    </div>
  )
}
