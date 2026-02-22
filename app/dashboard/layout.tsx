import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  const brand = userData?.organization?.primary_color ?? '#6366f1'

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ '--brand': brand } as React.CSSProperties}
    >
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
