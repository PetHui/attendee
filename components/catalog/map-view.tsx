'use client'

import { useState, useRef } from 'react'

export interface Exhibitor {
  id: string
  company_name: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  booth_number: string | null
  map_x: number | null
  map_y: number | null
  map_w: number | null
  map_h: number | null
  map_color: string | null
  exhibitor_offers: { id: string; title: string; description: string | null }[]
}

export interface MapElement {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  font_size: string
  text_color: string
  bg_color: string | null
  bold: boolean
  border_color: string | null
}

export interface Org {
  name: string
  slug: string
  primary_color: string | null
}

const DEFAULT_BOOTH_COLOR = '#bfdbfe'

const FONT_SIZE_CLASSES: Record<string, string> = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
}

export default function MapView({
  exhibitors,
  mapElements,
  mapImageUrl,
  mapAspectRatio,
  org,
  eventId,
  token,
  brand,
  highlightExhibitorId,
  teaser,
  registrationUrl,
}: {
  exhibitors: Exhibitor[]
  mapElements: MapElement[]
  mapImageUrl: string
  mapAspectRatio: number
  org: Org
  eventId: string
  token?: string
  brand: string
  highlightExhibitorId?: string
  teaser?: boolean
  registrationUrl?: string
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>()
  const placed = exhibitors.filter((e) => e.map_x != null)
  const activeId = hoveredId ?? selectedId
  const active = activeId ? placed.find((e) => e.id === activeId) : null

  function scheduleHoverClear() {
    hoverTimeout.current = setTimeout(() => setHoveredId(null), 1500)
  }
  function cancelHoverClear() {
    clearTimeout(hoverTimeout.current)
  }
  function closePopup() {
    setSelectedId(null)
    setHoveredId(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 text-center">Tryck på en monter för mer information</p>
      <div
        className="relative bg-white rounded-xl shadow-sm border border-gray-200"
        style={{ aspectRatio: String(mapAspectRatio) }}
        onClick={() => setSelectedId(null)}
      >
        <img
          src={mapImageUrl}
          alt="Hallkarta"
          className="absolute inset-0 w-full h-full object-cover rounded-xl"
          draggable={false}
        />
        {placed.map((e) => {
          const isActive = hoveredId === e.id || selectedId === e.id
          const isHighlighted = highlightExhibitorId === e.id
          const detailUrl = `/${org.slug}/${eventId}/catalog/${e.id}${token ? `?token=${token}` : ''}`
          return (
            <a
              key={e.id}
              href={detailUrl}
              onMouseEnter={() => { cancelHoverClear(); setHoveredId(e.id) }}
              onMouseLeave={scheduleHoverClear}
              onClick={(ev) => {
                ev.stopPropagation()
                const pointerType = (ev.nativeEvent as PointerEvent).pointerType
                if (pointerType !== 'mouse') {
                  ev.preventDefault()
                  setSelectedId((prev) => (prev === e.id ? null : e.id))
                }
              }}
              className="absolute rounded border flex flex-col items-center justify-center overflow-hidden transition-all"
              style={{
                left: `${e.map_x}%`,
                top: `${e.map_y}%`,
                width: `${e.map_w}%`,
                height: `${e.map_h}%`,
                backgroundColor: e.map_color ?? DEFAULT_BOOTH_COLOR,
                borderColor: isHighlighted ? brand : isActive ? brand : 'rgba(0,0,0,0.15)',
                zIndex: isHighlighted ? 5 : isActive ? 10 : 1,
                transform: isActive ? 'scale(1.03)' : undefined,
              }}
            >
              <span className="md:hidden text-[10px] font-bold text-gray-800 leading-none">
                {e.booth_number ?? e.company_name.slice(0, 3).toUpperCase()}
              </span>
              <span className="hidden md:block text-[10px] font-semibold text-gray-800 text-center px-1 leading-tight w-full truncate">
                {e.company_name}
              </span>
              {e.booth_number && (
                <span className="hidden md:block text-[8px] text-gray-600">{e.booth_number}</span>
              )}
            </a>
          )
        })}

        {mapElements.map((el) => (
          <div
            key={el.id}
            className="absolute flex items-center justify-center pointer-events-none rounded overflow-hidden p-1"
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              width: `${el.w}%`, height: `${el.h}%`,
              backgroundColor: el.bg_color ?? 'transparent',
              border: el.border_color ? `1px solid ${el.border_color}` : undefined,
              zIndex: 2,
            }}
          >
            <span
              className={`${FONT_SIZE_CLASSES[el.font_size] ?? 'text-xs'} ${el.bold ? 'font-bold' : 'font-medium'} text-center leading-tight`}
              style={{ color: el.text_color }}
            >
              {el.label}
            </span>
          </div>
        ))}

        {active && (
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-2 w-11/12 md:w-[36rem]"
            onMouseEnter={cancelHoverClear}
            onMouseLeave={scheduleHoverClear}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{active.company_name}</p>
                  {active.booth_number && (
                    <p className="text-xs text-gray-500 mt-0.5">Monter {active.booth_number}</p>
                  )}
                  {!teaser && active.description && (
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{active.description}</p>
                  )}
                  {!teaser && active.exhibitor_offers.length > 0 && (
                    <p className="text-xs text-amber-600 font-medium mt-1.5">🎁 {active.exhibitor_offers.length} erbjudande{active.exhibitor_offers.length > 1 ? 'n' : ''}</p>
                  )}
                  {teaser && registrationUrl && (
                    <a
                      href={registrationUrl}
                      style={{ backgroundColor: brand }}
                      className="inline-block mt-2.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap"
                    >
                      Registrera dig för att se mer →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!teaser && (
                    <a
                      href={`/${org.slug}/${eventId}/catalog/${active.id}${token ? `?token=${token}` : ''}`}
                      style={{ backgroundColor: brand }}
                      className="text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap"
                    >
                      Mer info →
                    </a>
                  )}
                  <button
                    onClick={closePopup}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Stäng"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {placed.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Inga montrar har placerats ut på kartan ännu.
        </div>
      )}
    </div>
  )
}
