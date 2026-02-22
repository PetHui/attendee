'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRESETS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#64748b', // slate
]

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function SettingsPage() {
  const [color, setColor] = useState('#6366f1')
  const [hexInput, setHexInput] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadColor() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('organization:organizations(primary_color)')
        .eq('id', user.id)
        .single()
      const c = (data?.organization as any)?.primary_color
      if (c) {
        setColor(c)
        setHexInput(c)
      }
    }
    loadColor()
  }, [])

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value)
    setHexInput(e.target.value)
    setSaved(false)
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) {
      setColor(val)
    }
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
        body: JSON.stringify({ primary_color: color }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Något gick fel.')
        return
      }
      setSaved(true)
      // Apply the new color immediately in the current tab
      document.documentElement.style.setProperty('--brand', color)
      const wrapper = document.querySelector('[style*="--brand"]') as HTMLElement | null
      if (wrapper) wrapper.style.setProperty('--brand', color)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Inställningar</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Organisationsfärg</h2>
          <p className="text-sm text-gray-500 mb-4">
            Används i sidomenyn och gränssnittet för din organisation.
          </p>

          {/* Color picker + hex input */}
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
              placeholder="#6366f1"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {/* Live preview */}
            <div
              className="flex-1 h-10 rounded-lg border border-gray-200 transition-colors"
              style={{ backgroundColor: isValidHex(hexInput) ? hexInput : color }}
            />
          </div>

          {/* Presets */}
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
