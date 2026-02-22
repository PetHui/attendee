import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import RegistrationForm from '@/components/registration/registration-form'
import { formatSwedishDate } from '@/lib/utils'

export default async function RegistrationPage({
  params,
}: {
  params: { orgSlug: string; eventId: string }
}) {
  const supabase = createServiceClient()

  // Find organization by slug
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', params.orgSlug)
    .single()

  if (!org) notFound()

  // Find published event
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .eq('organization_id', org.id)
    .eq('status', 'published')
    .single()

  if (!event) notFound()

  // Get registration fields
  const { data: fields } = await supabase
    .from('registration_fields')
    .select('*')
    .eq('event_id', event.id)
    .order('sort_order')

  // Participant count
  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  const isFull =
    event.max_participants != null && (count ?? 0) >= event.max_participants

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Event card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-indigo-600 px-6 py-8">
            <p className="text-indigo-200 text-sm font-medium mb-1">{org.name}</p>
            <h1 className="text-2xl font-bold text-white leading-tight">{event.title}</h1>
          </div>
          <div className="px-6 py-5 space-y-3">
            {event.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
            )}
            <div className="space-y-2 pt-1">
              {event.location && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="text-base">📍</span>
                  <span>{event.location}</span>
                </div>
              )}
              {event.starts_at && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="text-base">🗓</span>
                  <span>{formatSwedishDate(event.starts_at)}</span>
                </div>
              )}
              {event.max_participants && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="text-base">👥</span>
                  <span>
                    {count ?? 0} / {event.max_participants} platser bokade
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registration form or fullbokat */}
        {isFull ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">😔</p>
            <h2 className="font-semibold text-yellow-900 text-lg">Eventen är fullbokat</h2>
            <p className="text-yellow-700 text-sm mt-2">
              Tyvärr finns det inga platser kvar. Kontakta arrangören om du har frågor.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Anmäl dig</h2>
            <RegistrationForm eventId={event.id} fields={fields ?? []} />
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by{' '}
          <span className="font-semibold text-indigo-400">Attendee</span>
        </p>
      </div>
    </div>
  )
}
