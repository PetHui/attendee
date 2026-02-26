'use client'

import { useState, useEffect } from 'react'
import type { RegistrationField, ParticipantWithValues } from '@/types'
import { generateCSV } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function ParticipantsTable({
  eventId,
  eventTitle,
  fields,
  participants,
}: {
  eventId: string
  eventTitle: string
  fields: RegistrationField[]
  participants: ParticipantWithValues[]
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [localParticipants, setLocalParticipants] = useState(participants)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedParticipant = selectedId
    ? localParticipants.find((p) => p.id === selectedId) ?? null
    : null

  // Kolumner som visas i tabellen – de 3 första fälten
  const tableFields = fields.slice(0, 3)

  // Realtidsuppdatering – lyssna på incheckning från QR-skannern
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`participants-dashboard-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; checked_in_at: string | null; checked_in_by: string | null }
          setLocalParticipants((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? { ...p, checked_in_at: updated.checked_in_at, checked_in_by: updated.checked_in_by }
                : p
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  async function handleCheckin(participantId: string, qrCode: string) {
    setCheckingIn(participantId)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode }),
    })
    if (res.ok) {
      const now = new Date().toISOString()
      setLocalParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, checked_in_at: now, checked_in_by: 'dashboard' } : p))
      )
    }
    setCheckingIn(null)
  }

  async function handleUndoCheckin(participantId: string) {
    setCheckingIn(participantId)
    const res = await fetch('/api/checkin/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    })
    if (res.ok) {
      setLocalParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, checked_in_at: null } : p))
      )
    }
    setCheckingIn(null)
  }

  const filtered = localParticipants.filter((p) => {
    if (filter === 'checked_in' && !p.checked_in_at) return false
    if (filter === 'not_checked_in' && p.checked_in_at) return false
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

  const checkedInCount = localParticipants.filter((p) => p.checked_in_at).length

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Sök och filter */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Sök deltagare..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus-ring-brand"
            />
            <button
              onClick={downloadCSV}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Exportera CSV
            </button>
          </div>
          <div className="flex gap-2">
            {([
              { value: 'all', label: 'Alla' },
              { value: 'checked_in', label: 'Incheckade' },
              { value: 'not_checked_in', label: 'Ej incheckade' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === opt.value
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filter === opt.value ? { backgroundColor: 'var(--brand)' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabell */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Status
                </th>
                {tableFields.map((f) => (
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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableFields.length + 4}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    Inga deltagare hittades
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
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
                    {tableFields.map((f) => {
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
                      {p.checked_in_at ? (
                        <span>
                          {new Date(p.checked_in_at).toLocaleTimeString('sv-SE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${p.checked_in_by ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {p.checked_in_by ? 'Manuellt' : 'Skanner'}
                          </span>
                        </span>
                      ) : '–'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {p.checked_in_at ? (
                        <button
                          onClick={() => handleUndoCheckin(p.id)}
                          disabled={checkingIn === p.id}
                          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {checkingIn === p.id ? '...' : 'Ångra'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckin(p.id, p.qr_code)}
                          disabled={checkingIn === p.id}
                          className="px-3 py-1 text-xs font-medium text-white bg-brand rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                          {checkingIn === p.id ? 'Checkar in...' : 'Checka in'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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

      {/* Sidopanel – backdrop */}
      {selectedParticipant && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setSelectedId(null)}
        />
      )}

      {/* Sidopanel – panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          selectedParticipant ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedParticipant && (
          <>
            {/* Panel-header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Deltagare</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Anmäld {new Date(selectedParticipant.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Incheckningsstatus */}
            <div className="px-6 py-4 border-b border-gray-100">
              {selectedParticipant.checked_in_at ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      ✓ Incheckad
                    </span>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {new Date(selectedParticipant.checked_in_at).toLocaleTimeString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${selectedParticipant.checked_in_by ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {selectedParticipant.checked_in_by ? 'Manuellt' : 'Skanner'}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleUndoCheckin(selectedParticipant.id)}
                    disabled={checkingIn === selectedParticipant.id}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {checkingIn === selectedParticipant.id ? '...' : 'Ångra incheckning'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    Ej incheckad
                  </span>
                  <button
                    onClick={() => handleCheckin(selectedParticipant.id, selectedParticipant.qr_code)}
                    disabled={checkingIn === selectedParticipant.id}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {checkingIn === selectedParticipant.id ? 'Checkar in...' : 'Checka in'}
                  </button>
                </div>
              )}
            </div>

            {/* Formulärsvar */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">
                Anmälningssvar
              </p>
              <div className="space-y-4">
                {fields.map((f) => {
                  const fv = selectedParticipant.field_values.find((v) => v.field_id === f.id)
                  const value = f.field_type === 'checkbox'
                    ? fv?.value === 'true' ? 'Ja' : 'Nej'
                    : fv?.value ?? '–'
                  return (
                    <div key={f.id}>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">{f.label}</p>
                      <p className="text-sm text-gray-900">{value}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
