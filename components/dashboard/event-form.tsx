'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types'

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

interface EventFormProps {
  event?: Event
  organizationId: string
  orgColor?: string | null
  isSuperadmin?: boolean
}

export default function EventForm({ event, organizationId, orgColor, isSuperadmin = false }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    starts_at: event?.starts_at
      ? new Date(event.starts_at).toISOString().slice(0, 16)
      : '',
    ends_at: event?.ends_at
      ? new Date(event.ends_at).toISOString().slice(0, 16)
      : '',
    max_participants: event?.max_participants?.toString() ?? '',
    registration_deadline: event?.registration_deadline
      ? new Date(event.registration_deadline).toISOString().slice(0, 16)
      : '',
    status: event?.status ?? 'draft',
  })

  const [emailIntroText, setEmailIntroText] = useState(event?.email_intro_text ?? '')
  const [emailQrInstruction, setEmailQrInstruction] = useState(event?.email_qr_instruction ?? '')
  const [emailFooterNote, setEmailFooterNote] = useState(event?.email_footer_note ?? '')

  const [useCustomColor, setUseCustomColor] = useState(!!event?.primary_color)
  const [color, setColor] = useState(event?.primary_color ?? orgColor ?? '#172554')
  const [hexInput, setHexInput] = useState(event?.primary_color ?? orgColor ?? '#172554')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value)
    setHexInput(e.target.value)
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) setColor(val)
  }

  function handlePreset(preset: string) {
    setColor(preset)
    setHexInput(preset)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      organization_id: organizationId,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      registration_deadline: form.registration_deadline || null,
      primary_color: useCustomColor && isValidHex(color) ? color : null,
      email_intro_text: isSuperadmin ? (emailIntroText.trim() || null) : undefined,
      email_qr_instruction: isSuperadmin ? (emailQrInstruction.trim() || null) : undefined,
      email_footer_note: isSuperadmin ? (emailFooterNote.trim() || null) : undefined,
    }

    const url = event ? `/api/events/${event.id}` : '/api/events'
    const method = event ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const previewColor = useCustomColor && isValidHex(color) ? color : (orgColor ?? '#172554')

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          placeholder="Årets konferens"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand resize-none"
          placeholder="Beskriv eventet..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plats</label>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          placeholder="Mässhallen, Stockholm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
          <input
            type="datetime-local"
            name="starts_at"
            value={form.starts_at}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
          <input
            type="datetime-local"
            name="ends_at"
            value={form.ends_at}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max deltagare</label>
          <input
            type="number"
            name="max_participants"
            value={form.max_participants}
            onChange={handleChange}
            min="1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
            placeholder="Obegränsat"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sista anmälningsdag</label>
          <input
            type="datetime-local"
            name="registration_deadline"
            value={form.registration_deadline}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
          >
            <option value="draft">Utkast</option>
            <option value="published">Publicerat</option>
            <option value="closed">Stängt</option>
            <option value="archived">Arkiverat</option>
          </select>
        </div>
      </div>

      {/* Event color */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Eventfärg</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {useCustomColor ? 'Anpassad färg för detta event' : 'Använder organisationens standardfärg'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border border-gray-200"
              style={{ backgroundColor: previewColor }}
            />
            <button
              type="button"
              onClick={() => setUseCustomColor((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                useCustomColor ? 'bg-blue-950' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  useCustomColor ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {useCustomColor && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={isValidHex(color) ? color : '#172554'}
                onChange={handlePickerChange}
                className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                maxLength={7}
                placeholder="#172554"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              <div
                className="flex-1 h-9 rounded-lg border border-gray-200 transition-colors"
                style={{ backgroundColor: isValidHex(hexInput) ? hexInput : color }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  title={preset}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: preset,
                    borderColor: color === preset ? '#1f2937' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {isSuperadmin && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-amber-800">E-postbekräftelse — anpassade texter</p>
            <p className="text-xs text-amber-600 mt-0.5">Lämna tomt för att använda standardtexten.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">
              Inledningstext
            </label>
            <p className="text-xs text-amber-600 mb-1.5">
              Standard: "Din anmälan är bekräftad. Vi ser fram emot att träffa dig!"
            </p>
            <textarea
              value={emailIntroText}
              onChange={(e) => setEmailIntroText(e.target.value)}
              rows={2}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
              placeholder="Din anmälan är bekräftad. Vi ser fram emot att träffa dig!"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">
              Instruktion under QR-koden
            </label>
            <p className="text-xs text-amber-600 mb-1.5">
              Standard: "Visa denna kod vid entrén"
            </p>
            <input
              type="text"
              value={emailQrInstruction}
              onChange={(e) => setEmailQrInstruction(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              placeholder="Visa denna kod vid entrén"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">
              Fotnot
            </label>
            <p className="text-xs text-amber-600 mb-1.5">
              Standard: "Har du frågor? Kontakta arrangören direkt."
            </p>
            <input
              type="text"
              value={emailFooterNote}
              onChange={(e) => setEmailFooterNote(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              placeholder="Har du frågor? Kontakta arrangören direkt."
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sparar...' : event ? 'Uppdatera event' : 'Skapa event'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Avbryt
        </button>
      </div>
    </form>
  )
}
