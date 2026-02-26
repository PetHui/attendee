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
      <Sidebar user={user} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {impersonationBanner}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
