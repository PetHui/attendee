'use client'

import { useState } from 'react'

const PRESETS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
]

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function SettingsForm({
  orgId,
  initialColor,
  initialName,
  isSuperadmin,
}: {
  orgId: string
  initialColor: string
  initialName: string
  isSuperadmin: boolean
}) {
  const [color, setColor] = useState(initialColor)
  const [hexInput, setHexInput] = useState(initialColor)
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value)
    setHexInput(e.target.value)
    setSaved(false)
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) setColor(val)
    setSaved(false)
  }

  function handlePreset(preset: string) {
    setColor(preset)
    setHexInput(preset)
    setSaved(false)
  }

  async function handleSave() {
    if (!isValidHex(hexInput)) {
      setError('Ange en giltig hexkod, t.ex. #ff5500')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/organizations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: color, orgId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Något gick fel.')
        return
      }
      setSaved(true)
      document.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
        if (el.style.getPropertyValue('--brand')) {
          el.style.setProperty('--brand', color)
        }
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setNameSaving(true)
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
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } finally {
      setNameSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Inställningar</h1>

      {isSuperadmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Organisationsnamn</h2>
          <p className="text-sm text-gray-500 mb-4">
            Endast superadmin kan ändra organisationsnamnet.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameSaved(false) }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              {nameSaving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
          {nameSaved && (
            <p className="text-sm text-green-600 mt-2">Namnet sparades.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Organisationsfärg</h2>
          <p className="text-sm text-gray-500 mb-4">
            Används i sidomenyn och gränssnittet för din organisation.
          </p>

          <div className="flex items-center gap-3 mb-5">
            <input
              type="color"
              value={color}
              onChange={handlePickerChange}
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              maxLength={7}
              placeholder="#172554"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <div
              className="flex-1 h-10 rounded-lg border border-gray-200 transition-colors"
              style={{ backgroundColor: isValidHex(hexInput) ? hexInput : color }}
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Snabbval</p>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  title={preset}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: preset,
                    borderColor: color === preset ? '#1f2937' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            Färgen sparades.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {saving ? 'Sparar...' : 'Spara färg'}
        </button>
      </div>
    </div>
  )
}
