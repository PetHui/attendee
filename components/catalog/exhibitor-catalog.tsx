'use client'

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
}: {
  event: Event
  org: Org
  exhibitors: Exhibitor[]
  isUnlocked: boolean
  registrationUrl: string
  token?: string
}) {
  const brand = org.primary_color ?? '#6366f1'
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

            {exhibitors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">🏢</p>
                <p>Inga utställare publicerade ännu.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {exhibitors.map((ex, i) => {
                  const hasOffer = ex.exhibitor_offers.length > 0
                  const detailUrl = `/${org.slug}/${event.id}/catalog/${ex.id}${token ? `?token=${token}` : ''}`
                  return (
                    <a
                      key={ex.id}
                      href={detailUrl}
                      className={`flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {/* Avatar */}
                      <div
                        style={hasOffer ? { background: brand } : undefined}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${hasOffer ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {ex.company_name.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Namn + monter */}
                      <div className="ml-3 flex-1 min-w-0">
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
