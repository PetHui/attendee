import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import CheckinClient from '@/components/checkin/checkin-client'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('checkin_token', id)
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
      checkinToken={id}
    />
  )
}
