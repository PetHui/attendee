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
  primary_color: string | null
}

export default function ExhibitorCatalog({
  event,
  org,
  exhibitors,
  isUnlocked,
  registrationUrl,
}: {
  event: Event
  org: Org
  exhibitors: Exhibitor[]
  isUnlocked: boolean
  registrationUrl: string
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
          /* Teaser — ej inloggad */
          <div className="text-center py-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <p className="text-5xl mb-4">🔒</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {exhibitors.length > 0
                  ? `${exhibitors.length} utställare väntar`
                  : 'Utställarkatalogen'}
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

            {/* Dold förhandsvisning */}
            {exhibitors.length > 0 && (
              <div className="mt-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/70 to-gray-50 z-10 rounded-xl" />
                <div className="space-y-3 opacity-40 pointer-events-none select-none">
                  {exhibitors.slice(0, 3).map((ex) => (
                    <div key={ex.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm shrink-0">
                          {ex.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{ex.company_name}</p>
                          {ex.booth_number && <p className="text-xs text-gray-400">Monter {ex.booth_number}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upplåst katalog */
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {exhibitors.length} utställare
                {withOffers.length > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    · {withOffers.length} med erbjudande
                  </span>
                )}
              </p>
            </div>

            {exhibitors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">🏢</p>
                <p>Inga utställare publicerade ännu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exhibitors.map((ex) => {
                  const hasOffer = ex.exhibitor_offers.length > 0
                  return (
                    <div
                      key={ex.id}
                      className={`bg-white rounded-2xl border overflow-hidden ${
                        hasOffer ? 'border-amber-200 shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            style={hasOffer ? { background: brand } : undefined}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                              hasOffer ? 'text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {ex.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900">{ex.company_name}</h3>
                              {ex.booth_number && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  Monter {ex.booth_number}
                                </span>
                              )}
                              {hasOffer && (
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  🎁 Erbjudande
                                </span>
                              )}
                            </div>
                            {ex.description && (
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{ex.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {ex.website && (
                                <a
                                  href={ex.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand hover:opacity-70 transition-opacity"
                                >
                                  🌐 Webbplats
                                </a>
                              )}
                              {ex.email && (
                                <a
                                  href={`mailto:${ex.email}`}
                                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  ✉️ {ex.email}
                                </a>
                              )}
                              {ex.phone && (
                                <a
                                  href={`tel:${ex.phone}`}
                                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  📞 {ex.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Erbjudande-sektion */}
                      {hasOffer && (
                        <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-0.5 uppercase tracking-wide">
                            Mässerbjudande
                          </p>
                          <p className="text-sm font-semibold text-amber-900">
                            {ex.exhibitor_offers[0].title}
                          </p>
                          {ex.exhibitor_offers[0].description && (
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                              {ex.exhibitor_offers[0].description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
