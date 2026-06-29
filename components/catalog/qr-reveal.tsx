'use client'

import { useState } from 'react'

export default function QrReveal({
  qrCodeBase64,
  token,
  participantName,
}: {
  qrCodeBase64: string
  token: string
  participantName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium px-4 py-2 rounded-xl"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-6.343-.707.707M6.343 17.657l-.707.707m11.314 0-.707-.707M6.343 6.343l-.707-.707" />
          <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
          <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
          <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
        </svg>
        {open ? 'Dölj min QR-kod' : 'Visa min QR-kod'}
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl p-4 inline-block shadow-lg text-center">
          {participantName && (
            <p className="text-gray-900 font-semibold text-lg mb-3">{participantName}</p>
          )}
          <img src={qrCodeBase64} alt="Din QR-kod" width={200} height={200} className="block" />
          <p className="text-2xl font-bold tracking-widest text-gray-900 mt-3">
            {token.slice(0, 6).toUpperCase()}
          </p>
        </div>
      )}
    </div>
  )
}
