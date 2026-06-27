import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import EventForm from '@/components/dashboard/event-form'
import CheckinLinkPanel from '@/components/dashboard/checkin-link-panel'
import Link from 'next/link'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, organization:organizations(slug)')
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

  let orgSlug = (userData?.organization as any)?.slug ?? ''
  let orgColor: string | null = null
  if (impersonatedOrgId) {
    const { data: impOrg } = await dataClient
      .from('organizations')
      .select('slug, primary_color')
      .eq('id', impersonatedOrgId)
      .single()
    orgSlug = impOrg?.slug ?? ''
    orgColor = impOrg?.primary_color ?? null
  } else {
    const { data: org } = await dataClient
      .from('organizations')
      .select('primary_color')
      .eq('id', effectiveOrgId)
      .single()
    orgColor = org?.primary_color ?? null
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          ← Tillbaka till event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Redigera event</h1>
        <p className="text-gray-500 mt-1">{event.title}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <EventForm event={event} organizationId={effectiveOrgId ?? ''} orgColor={orgColor} isSuperadmin={userData?.role === 'superadmin'} />
      </div>

      {orgSlug && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Publik anmälningslänk</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-brand break-all">
              {appUrl}/{orgSlug}/{event.id}
            </code>
            <Link
              href={`/${orgSlug}/${event.id}`}
              target="_blank"
              className="text-xs text-brand hover:opacity-70 whitespace-nowrap transition-opacity"
            >
              Öppna ↗
            </Link>
          </div>
        </div>
      )}

      <CheckinLinkPanel
        eventId={event.id}
        checkinToken={event.checkin_token}
        appUrl={appUrl}
      />
    </div>
  )
}
