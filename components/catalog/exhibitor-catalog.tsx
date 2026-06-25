'use client'

import { useState } from 'react'

interface Offer {
  id: string
  title: string
  description: string | null
}

interface Exhibitor {
  id: string
  company_name: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  booth_number: string | null
  exhibitor_offers: Offer[]
}

interface Event {
  id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  location: string | null
}

interface Org {
  name: string
  slug: string
  primary_color: string | null
}

export default function ExhibitorCatalog({
  event,
  org,
  exhibitors,
  isUnlocked,
  registrationUrl,
  token,
  qrCodeBase64,
  participantName,
}: {
  event: Event
  org: Org
  exhibitors: Exhibitor[]
  isUnlocked: boolean
  registrationUrl: string
  token?: string
  qrCodeBase64?: string
  participantName?: string
}) {
  const brand = org.primary_color ?? '#6366f1'
  const [query, setQuery] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const filtered = query.trim()
    ? exhibitors.filter((e) =>
        e.company_name.toLowerCase().includes(query.toLowerCase()) ||
        e.booth_number?.toLowerCase().includes(query.toLowerCase())
      )
    : exhibitors
  const withOffers = exhibitors.filter((e) => e.exhibitor_offers.length > 0)

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand': brand } as React.CSSProperties}>
      {/* Header */}
      <div style={{ background: brand }} className="px-4 pt-8 pb-6 text-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/70 text-sm mb-1">{org.name}</p>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-white/80 text-sm mt-1">Utställarkatalog</p>
          {event.location && (
            <p className="text-white/60 text-xs mt-2">{event.location}</p>
          )}

          {qrCodeBase64 && (
            <div className="mt-4">
              <button
                onClick={() => setQrOpen((v) => !v)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium px-4 py-2 rounded-xl"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-6.343-.707.707M6.343 17.657l-.707.707m11.314 0-.707-.707M6.343 6.343l-.707-.707" />
                  <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                  <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                  <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                </svg>
                {qrOpen ? 'Dölj min QR-kod' : 'Visa min QR-kod'}
              </button>

              {qrOpen && (
                <div className="mt-3 bg-white rounded-2xl p-4 inline-block shadow-lg text-center">
                  {participantName && (
                    <p className="text-gray-900 font-semibold text-lg mb-3">{participantName}</p>
                  )}
                  <img src={qrCodeBase64} alt="Din QR-kod" width={200} height={200} className="block" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!isUnlocked ? (
          /* Teaser */
          <div className="text-center py-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <p className="text-5xl mb-4">🔒</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {exhibitors.length > 0 ? `${exhibitors.length} utställare väntar` : 'Utställarkatalogen'}
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                Registrera dig som besökare för att se alla utställare och ta del av exklusiva erbjudanden på mässan.
              </p>
              {withOffers.length > 0 && (
                <p className="text-amber-600 text-sm font-medium mb-6">
                  🎁 {withOffers.length} utställare har specialerbjudanden!
                </p>
              )}
              <a
                href={registrationUrl}
                style={{ background: brand }}
                className="inline-block text-white font-semibold px-8 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                Registrera dig gratis →
              </a>
            </div>

            {/* Suddig förhandsgranskning */}
            {exhibitors.length > 0 && (
              <div className="mt-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/70 to-gray-50 z-10 rounded-xl" />
                <div className="opacity-40 pointer-events-none select-none bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {exhibitors.slice(0, 4).map((ex, i) => (
                    <div key={ex.id} className={`flex items-center px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                        {ex.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">{ex.company_name}</span>
                        {ex.booth_number && <span className="text-xs text-gray-400 ml-2">Monter {ex.booth_number}</span>}
                      </div>
                      {ex.exhibitor_offers.length > 0 && (
                        <span className="text-xs text-amber-600 font-medium">🎁</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upplåst katalog — kompakt lista */
          <div>
            <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
              <span>{exhibitors.length} utställare</span>
              {withOffers.length > 0 && (
                <span className="text-amber-600 font-medium">· 🎁 {withOffers.length} med erbjudande</span>
              )}
            </div>

            {/* Sökfält */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök utställare eller monternummer..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-3">🔍</p>
                <p>Inga utställare matchar "{query}".</p>
              </div>
            ) : exhibitors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">🏢</p>
                <p>Inga utställare publicerade ännu.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {filtered.map((ex, i) => {
                  const hasOffer = ex.exhibitor_offers.length > 0
                  const detailUrl = `/${org.slug}/${event.id}/catalog/${ex.id}${token ? `?token=${token}` : ''}`
                  return (
                    <a
                      key={ex.id}
                      href={detailUrl}
                      className={`flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {/* Namn + monter */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900">{ex.company_name}</span>
                        {ex.booth_number && (
                          <span className="text-xs text-gray-400 ml-2">Monter {ex.booth_number}</span>
                        )}
                      </div>

                      {/* Höger: erbjudande-badge + pil */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasOffer && (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            🎁 Erbjudande
                          </span>
                        )}
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
