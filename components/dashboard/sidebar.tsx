'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

interface EventContext {
  title: string
  checkin_token: string | null
}

export default function Sidebar({
  user,
  collapsed,
  onToggle,
}: {
  user: UserProfile | null
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const eventMatch = pathname.match(/\/dashboard\/events\/([^/]+)/)
  const eventId = eventMatch?.[1] ?? null

  const [eventContext, setEventContext] = useState<EventContext | null>(null)

  useEffect(() => {
    if (!eventId) { setEventContext(null); return }
    const supabase = createClient()
    supabase
      .from('events')
      .select('title, checkin_token')
      .eq('id', eventId)
      .single()
      .then(({ data }) => setEventContext(data ?? null))
  }, [eventId])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const canAccessSettings = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin'
  const isSuperadmin = user?.role === 'superadmin'

  const eventNavItems = eventId ? [
    { href: `/dashboard/events/${eventId}`,              label: 'Inställningar', icon: '⚙️',  exact: true },
    { href: `/dashboard/events/${eventId}/fields`,       label: 'Formulärfält',  icon: '📋', exact: false },
    { href: `/dashboard/events/${eventId}/participants`, label: 'Deltagare',     icon: '👥', exact: false },
    { href: `/dashboard/events/${eventId}/exhibitors`,   label: 'Utställare',    icon: '🏢', exact: false },
    { href: `/dashboard/events/${eventId}/map`,          label: 'Hallkarta',     icon: '🗺️', exact: false },
    ...(eventContext?.checkin_token
      ? [{ href: `/checkin/${eventContext.checkin_token}`, label: 'Incheckning', icon: '📱', exact: false }]
      : []
    ),
  ] : []

  function isEventItemActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const navLinkCls = (active: boolean) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
    } ${active ? '' : 'text-gray-600 hover:bg-gray-100'}`

  const activeStyle = {
    color: 'var(--brand)',
    backgroundColor: 'color-mix(in srgb, var(--brand) 10%, white)',
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-56'
      } transition-[width] duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden`}
    >
      {/* Logotyp */}
      <div className={`border-b border-gray-200 flex items-center shrink-0 ${collapsed ? 'h-[73px] justify-center' : 'p-5'}`}>
        {collapsed ? (
          <Link href="/dashboard">
            <span className="text-xl font-bold" style={{ color: 'var(--brand)' }}>A</span>
          </Link>
        ) : (
          <Link href="/dashboard">
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand)' }}>Attendee</h1>
            {user?.organization && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{user.organization.name}</p>
            )}
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'}`}>
        {eventId ? (
          <>
            {/* Tillbaka till eventlistan */}
            <Link
              href="/dashboard"
              title={collapsed ? 'Mina event' : undefined}
              className={`flex items-center rounded-lg text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors mb-3 ${
                collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-1.5'
              }`}
            >
              <span className="shrink-0">←</span>
              {!collapsed && <span>Mina event</span>}
            </Link>

            {/* Eventnamn */}
            {!collapsed && (
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-gray-700 truncate">
                  {eventContext?.title ?? '…'}
                </p>
              </div>
            )}

            {/* Event-specifika länkar */}
            <div className="space-y-0.5">
              {eventNavItems.map((item) => {
                const active = isEventItemActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={navLinkCls(active)}
                    style={active ? activeStyle : undefined}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && item.label}
                  </Link>
                )
              })}
            </div>
          </>
        ) : (
          /* Normal vy — bara Event-länken */
          <Link
            href="/dashboard"
            title={collapsed ? 'Event' : undefined}
            className={navLinkCls(pathname === '/dashboard' || (pathname.startsWith('/dashboard/events') && !eventId))}
            style={
              pathname === '/dashboard' || pathname.startsWith('/dashboard/events')
                ? activeStyle
                : undefined
            }
          >
            <span className="text-lg shrink-0">📅</span>
            {!collapsed && 'Event'}
          </Link>
        )}
      </nav>

      {/* Botten */}
      <div className={`border-t border-gray-200 space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
        {isSuperadmin && (
          <Link
            href="/superadmin"
            title={collapsed ? 'Superadmin' : undefined}
            className={navLinkCls(pathname.startsWith('/superadmin'))}
            style={pathname.startsWith('/superadmin') ? activeStyle : undefined}
          >
            <span className="text-lg shrink-0">⚙️</span>
            {!collapsed && 'Superadmin'}
          </Link>
        )}

        {canAccessSettings && (
          <Link
            href="/dashboard/settings"
            title={collapsed ? 'Inställningar' : undefined}
            className={navLinkCls(pathname === '/dashboard/settings')}
            style={pathname === '/dashboard/settings' ? activeStyle : undefined}
          >
            <span className="text-lg shrink-0">🎨</span>
            {!collapsed && 'Inställningar'}
          </Link>
        )}

        {/* Användarinfo */}
        {collapsed ? (
          <div className="flex justify-center py-2" title={user?.name ?? ''}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand) 15%, white)',
                color: 'var(--brand)',
              }}
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand) 15%, white)',
                color: 'var(--brand)',
              }}
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? '–'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={handleSignOut}
            className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded"
          >
            Logga ut
          </button>
        )}

        {/* Toggle-knapp */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandera meny' : 'Minimera meny'}
          className={`flex items-center w-full rounded-lg px-2 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            )}
          </svg>
          {!collapsed && <span className="text-sm">Minimera</span>}
        </button>
      </div>
    </aside>
  )
}
