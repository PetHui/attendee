'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types'

interface EventFormProps {
  event?: Event
  organizationId: string
}

export default function EventForm({ event, organizationId }: EventFormProps) {
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
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
