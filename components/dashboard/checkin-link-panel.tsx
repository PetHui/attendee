'use client'

import { useState } from 'react'

export default function CheckinLinkPanel({
  eventId,
  checkinToken,
  appUrl,
}: {
  eventId: string
  checkinToken: string
  appUrl: string
}) {
  const [token, setToken] = useState(checkinToken)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const checkinUrl = `${appUrl}/checkin/${token}`

  async function handleCopy() {
    await navigator.clipboard.writeText(checkinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!confirm('Är du säker? Den gamla länken slutar fungera omedelbart.')) return
    setRegenerating(true)
    try {
      const res = await fetch(`/api/events/${eventId}/regenerate-checkin-token`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) setToken(data.checkin_token)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Incheckning-länk (ingen inloggning krävs)</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {regenerating ? 'Regenererar...' : 'Regenerera'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-brand break-all">
          {checkinUrl}
        </code>
        <button
          onClick={handleCopy}
          className="text-xs text-brand hover:opacity-70 whitespace-nowrap transition-opacity"
        >
          {copied ? 'Kopierad!' : 'Kopiera'}
        </button>
      </div>
    </div>
  )
}
