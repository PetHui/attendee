'use client'

import { useState } from 'react'
import type { RegistrationField } from '@/types'

export default function RegistrationForm({
  eventId,
  fields,
}: {
  eventId: string
  fields: RegistrationField[]
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Client-side validation
    for (const field of fields) {
      if (field.required) {
        const val = values[field.id]
        if (!val || (field.field_type === 'checkbox' && val !== 'true')) {
          setError(`Fältet "${field.label}" är obligatoriskt.`)
          setLoading(false)
          return
        }
      }
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, fieldValues: values }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Något gick fel. Försök igen.')
      setLoading(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Anmälan mottagen!</h2>
        <p className="text-gray-600 leading-relaxed">
          Du är nu anmäld. En bekräftelse med din personliga QR-kod för incheckning skickas till
          din e-post.
        </p>
        <p className="text-gray-400 text-sm mt-3">
          Kontrollera skräpposten om mailet inte dyker upp inom någon minut.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {fields.map((field) => (
        <div key={field.id}>
          {field.field_type !== 'checkbox' && (
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}

          {field.field_type === 'text' && (
            <input
              type={
                field.label.toLowerCase().match(/e-?post|email|mejl/)
                  ? 'email'
                  : field.label.toLowerCase().match(/telefon|mobil|phone/)
                  ? 'tel'
                  : 'text'
              }
              value={values[field.id] ?? ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
            />
          )}

          {field.field_type === 'select' && (
            <select
              value={values[field.id] ?? ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus-ring-brand"
            >
              <option value="">Välj alternativ...</option>
              {((field.options as string[]) ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {field.field_type === 'checkbox' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values[field.id] === 'true'}
                onChange={(e) =>
                  handleChange(field.id, e.target.checked ? 'true' : 'false')
                }
                required={field.required}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 focus-ring-brand"
                style={{ accentColor: 'var(--brand)' }}
              />
              <span className="text-sm text-gray-700 leading-tight">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white py-3 px-4 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
      >
        {loading ? 'Skickar anmälan...' : 'Skicka anmälan'}
      </button>
    </form>
  )
}
