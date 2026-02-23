'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/types'
import { formatSwedishDate } from '@/lib/utils'

const QrScanner = dynamic(() => import('./qr-scanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-800 rounded-xl">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Startar kamera...</p>
      </div>
    </div>
  ),
})

interface ScanResult {
  alreadyCheckedIn: boolean
  participant: {
    id: string
    checked_in_at: string
    field_values: {
      value: string | null
      field: { label: string; sort_order: number }
    }[]
    event: { id: string; title: string }
  }
}

export default function CheckinClient({
  event,
  initialTotal,
  initialCheckedIn,
  checkinToken,
}: {
  event: Event
  initialTotal: number
  initialCheckedIn: number
  checkinToken: string
}) {
  const [total, setTotal] = useState(initialTotal)
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showScanner, setShowScanner] = useState(true)

  // Supabase Realtime – uppdatera räknaren live
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`checkin-event-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const updated = payload.new as { checked_in_at: string | null }
          const old = payload.old as { checked_in_at: string | null }
          // Only increment if this is a new check-in (not already checked in)
          if (updated.checked_in_at && !old.checked_in_at) {
            setCheckedIn((prev) => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          setTotal((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event.id])

  const handleScan = useCallback(
    async (qrCode: string) => {
      if (isProcessing) return
      setIsProcessing(true)
      setScanResult(null)
      setScanError(null)
      setShowScanner(false)

      try {
        const res = await fetch('/api/checkin/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode, checkinToken }),
        })

        const data = await res.json()

        if (!res.ok) {
          setScanError(data.error ?? 'Okänt fel')
        } else {
          setScanResult(data)
        }
      } catch {
        setScanError('Nätverksfel. Kontrollera anslutningen.')
      }

      // Resume scanner after 4 seconds
      setTimeout(() => {
        setScanResult(null)
        setScanError(null)
        setShowScanner(true)
        setIsProcessing(false)
      }, 4000)
    },
    [isProcessing]
  )

  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-start gap-4">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm mt-0.5"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">{event.title}</h1>
          {event.starts_at && (
            <p className="text-gray-400 text-xs mt-0.5">{formatSwedishDate(event.starts_at)}</p>
          )}
        </div>
      </div>

      {/* Live counter */}
      <div className="px-5 mb-5">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                Incheckade
              </p>
              <p className="text-5xl font-bold tabular-nums">
                {checkedIn}
                <span className="text-2xl text-gray-500 font-normal"> / {total}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-400">{percentage}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {total - checkedIn} kvar
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5">
            <div
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scanner + result */}
      <div className="flex-1 px-5 pb-8">
        {showScanner && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 mb-4">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide">
                Skanna QR-kod
              </p>
            </div>
            <div className="p-4">
              <QrScanner onScan={handleScan} />
            </div>
          </div>
        )}

        {isProcessing && !scanResult && !scanError && (
          <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Kontrollerar deltagare...</p>
          </div>
        )}

        {/* Success result */}
        {scanResult && (
          <div
            className={`rounded-2xl p-6 border ${
              scanResult.alreadyCheckedIn
                ? 'bg-yellow-950/50 border-yellow-600'
                : 'bg-green-950/50 border-green-600'
            }`}
          >
            <div className="text-center mb-5">
              <p className="text-5xl mb-3">
                {scanResult.alreadyCheckedIn ? '⚠️' : '✅'}
              </p>
              <p
                className={`text-xl font-bold ${
                  scanResult.alreadyCheckedIn ? 'text-yellow-400' : 'text-green-400'
                }`}
              >
                {scanResult.alreadyCheckedIn ? 'Redan incheckad' : 'Incheckad!'}
              </p>
              {scanResult.alreadyCheckedIn && (
                <p className="text-yellow-500 text-sm mt-1">
                  Incheckad kl.{' '}
                  {new Date(scanResult.participant.checked_in_at).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            {/* Participant info */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
              {scanResult.participant.field_values
                .sort((a, b) => a.field.sort_order - b.field.sort_order)
                .slice(0, 5)
                .map((fv, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <span className="text-gray-500 min-w-[100px] shrink-0">
                      {fv.field.label}
                    </span>
                    <span className="font-medium text-white">{fv.value ?? '–'}</span>
                  </div>
                ))}
            </div>

            <p className="text-center text-xs text-gray-600 mt-4">
              Kameran återupptas om 4 sekunder...
            </p>
          </div>
        )}

        {/* Error result */}
        {scanError && (
          <div className="bg-red-950/50 border border-red-700 rounded-2xl p-8 text-center">
            <p className="text-5xl mb-3">❌</p>
            <p className="text-red-400 font-semibold text-lg">{scanError}</p>
            <p className="text-gray-600 text-xs mt-3">Kameran återupptas om 4 sekunder...</p>
          </div>
        )}
      </div>
    </div>
  )
}
