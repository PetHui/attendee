import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParticipantsTable from '@/components/dashboard/participants-table'
import Link from 'next/link'

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: fields } = await supabase
    .from('registration_fields')
    .select('*')
    .eq('event_id', id)
    .order('sort_order')

  const { data: participants } = await supabase
    .from('participants')
    .select('*, field_values:participant_field_values(*)')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  const checkedIn = participants?.filter((p) => p.checked_in_at).length ?? 0
  const total = participants?.length ?? 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          ← Tillbaka till event
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deltagare</h1>
            <p className="text-gray-500 mt-1">{event.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
              {checkedIn} / {total} incheckade
            </span>
            <Link
              href={`/checkin/${id}`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Gå till incheckning
            </Link>
          </div>
        </div>
      </div>

      <ParticipantsTable
        eventTitle={event.title}
        fields={fields ?? []}
        participants={participants ?? []}
      />
    </div>
  )
}
