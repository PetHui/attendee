import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import CheckinClient from '@/components/checkin/checkin-client'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { count: totalCount } = await dataClient
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  const { count: checkedInCount } = await dataClient
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .not('checked_in_at', 'is', null)

  return (
    <CheckinClient
      event={event}
      initialTotal={totalCount ?? 0}
      initialCheckedIn={checkedInCount ?? 0}
    />
  )
}
