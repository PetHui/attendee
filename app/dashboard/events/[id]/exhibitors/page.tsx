import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import ExhibitorList from '@/components/dashboard/exhibitor-list'
import Link from 'next/link'

export default async function ExhibitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const impersonatedOrgId = userData?.role === 'superadmin' ? await getImpersonatedOrgId() : null
  const effectiveOrgId = impersonatedOrgId ?? userData?.organization_id
  const dataClient = impersonatedOrgId ? createServiceClient() : supabase

  const { data: event } = await dataClient
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) notFound()

  const serviceClient = createServiceClient()
  const [{ data: exhibitors }, { data: presets }] = await Promise.all([
    serviceClient
      .from('exhibitors')
      .select('*, offers:exhibitor_offers(id)')
      .eq('event_id', id)
      .order('sort_order')
      .order('created_at'),
    serviceClient
      .from('booth_size_presets')
      .select('id, name')
      .eq('event_id', id)
      .order('sort_order'),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          ← Tillbaka till event
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utställare</h1>
            <p className="text-gray-500 mt-1">{event.title}</p>
          </div>
        </div>
      </div>

      <ExhibitorList
        eventId={id}
        exhibitors={exhibitors ?? []}
        presets={presets ?? []}
        appUrl={appUrl}
      />
    </div>
  )
}
