'use client'

import { useState } from 'react'
import type { RegistrationField, ParticipantWithValues } from '@/types'
import { generateCSV } from '@/lib/utils'

export default function ParticipantsTable({
  eventTitle,
  fields,
  participants,
}: {
  eventTitle: string
  fields: RegistrationField[]
  participants: ParticipantWithValues[]
}) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter((p) => {
    if (!search) return true
    const allValues = p.field_values
      .map((fv) => fv.value?.toLowerCase() ?? '')
      .join(' ')
    return allValues.includes(search.toLowerCase())
  })

  function downloadCSV() {
    const headers = ['Anmäld', 'Incheckad', 'QR-kod', ...fields.map((f) => f.label)]
    const rows = participants.map((p) => {
      const registered = new Date(p.created_at).toLocaleString('sv-SE')
      const checkedIn = p.checked_in_at
        ? new Date(p.checked_in_at).toLocaleString('sv-SE')
        : ''
      const values = fields.map((f) => {
        const fv = p.field_values.find((v) => v.field_id === f.id)
        return fv?.value ?? ''
      })
      return [registered, checkedIn, p.qr_code, ...values]
    })

    const csv = generateCSV(headers, rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '-')}-deltagare.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const checkedInCount = participants.filter((p) => p.checked_in_at).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <input
          type="search"
          placeholder="Sök deltagare..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={downloadCSV}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Exportera CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Status
              </th>
              {fields.map((f) => (
                <th
                  key={f.id}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {f.label}
                </th>
              ))}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Anmäld
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Incheckad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 3}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Inga deltagare hittades
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {p.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Incheckad
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Ej incheckad
                      </span>
                    )}
                  </td>
                  {fields.map((f) => {
                    const fv = p.field_values.find((v) => v.field_id === f.id)
                    return (
                      <td key={f.id} className="px-4 py-3 text-gray-700 max-w-xs truncate">
                        {f.field_type === 'checkbox'
                          ? fv?.value === 'true'
                            ? '✓'
                            : '–'
                          : fv?.value ?? '–'}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString('sv-SE')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {p.checked_in_at
                      ? new Date(p.checked_in_at).toLocaleTimeString('sv-SE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '–'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>
          {filtered.length} av {participants.length} deltagare
        </span>
        <span>
          {checkedInCount} incheckade ({participants.length > 0
            ? Math.round((checkedInCount / participants.length) * 100)
            : 0}
          %)
        </span>
      </div>
    </div>
  )
}
