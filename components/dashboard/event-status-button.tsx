'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EventStatus } from '@/types'

export default function EventStatusButton({
  eventId,
  status,
}: {
  eventId: string
  status: EventStatus
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: EventStatus) {
    setLoading(true)
    await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  if (status === 'published') {
    return (
      <button
        onClick={() => updateStatus('closed')}
        disabled={loading}
        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {loading ? '...' : 'Stäng anmälan'}
      </button>
    )
  }

  if (status === 'closed' || status === 'draft') {
    return (
      <button
        onClick={() => updateStatus('published')}
        disabled={loading}
        className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50 transition-colors"
      >
        {loading ? '...' : 'Öppna anmälan'}
      </button>
    )
  }

  return null
}
