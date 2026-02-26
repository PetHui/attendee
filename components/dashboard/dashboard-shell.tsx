'use client'

import { useState, useEffect } from 'react'
import Sidebar from './sidebar'
import type { UserProfile } from '@/types'

export default function DashboardShell({
  user,
  brand,
  impersonationBanner,
  children,
}: {
  user: UserProfile | null
  brand: string
  impersonationBanner?: React.ReactNode
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ '--brand': brand } as React.CSSProperties}
    >
      {/* Sidomeny – animerar bredden */}
      <div
        className={`shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-0' : 'w-64'
        }`}
      >
        <div className="w-64 h-full">
          <Sidebar user={user} />
        </div>
      </div>

      {/* Höger sida – innehåll + toggle-knapp */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {impersonationBanner}

        {/* Toggle-knapp – alltid synlig vid vänsterkanten */}
        <button
          onClick={toggle}
          title={collapsed ? 'Visa meny' : 'Dölj meny'}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-16 w-5 bg-white border border-l-0 border-gray-200 rounded-r-lg shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
