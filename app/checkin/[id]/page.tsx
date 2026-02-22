import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .single()

  if (!event) notFound()

  const { count: totalCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  const { count: checkedInCount } = await supabase
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
