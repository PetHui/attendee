import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import ExhibitorAdminForm from '@/components/dashboard/exhibitor-admin-form'
import Link from 'next/link'

export default async function ExhibitorAdminPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>
}) {
  const { id, eid } = await params
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
    .select('id, title, organization_id')
    .eq('id', id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) notFound()

  const serviceClient = createServiceClient()

  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*')
    .eq('id', eid)
    .eq('event_id', id)
    .single()

  if (!exhibitor) notFound()

  const [{ data: contacts }, { data: billing }, { data: offers }] = await Promise.all([
    serviceClient.from('exhibitor_contacts').select('*').eq('exhibitor_id', eid).order('is_primary', { ascending: false }),
    serviceClient.from('exhibitor_billing').select('*').eq('exhibitor_id', eid).maybeSingle(),
    serviceClient.from('exhibitor_offers').select('*, redemptions:offer_redemptions(id, participant_id, redeemed_at)').eq('exhibitor_id', eid),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${id}/exhibitors`}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          ← Tillbaka till utställare
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exhibitor.company_name}</h1>
            <p className="text-gray-500 mt-1">{event.title}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              exhibitor.status === 'published'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {exhibitor.status === 'published' ? 'Publicerad' : 'Utkast'}
          </span>
        </div>
      </div>

      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Utställarens redigeringslänk</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-brand break-all">
            {appUrl}/exhibitor/{exhibitor.edit_token}
          </code>
          <a
            href={`/exhibitor/${exhibitor.edit_token}`}
            target="_blank"
            className="text-xs text-brand hover:opacity-70 whitespace-nowrap transition-opacity"
          >
            Öppna ↗
          </a>
        </div>
      </div>

      <ExhibitorAdminForm
        exhibitor={exhibitor}
        contacts={contacts ?? []}
        billing={billing ?? null}
        offers={offers ?? []}
      />
    </div>
  )
}
