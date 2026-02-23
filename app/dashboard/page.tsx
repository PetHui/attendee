import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import { formatShortDate, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/utils'
import EventStatusButton from '@/components/dashboard/event-status-button'

export default async function DashboardPage() {
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

  const impersonatedOrgId =
    userData?.role === 'superadmin' ? await getImpersonatedOrgId() : null

  const effectiveOrgId = impersonatedOrgId ?? userData?.organization_id

  // Hämta slug för impersonerad org om nödvändigt
  let orgSlug = (userData?.organization as any)?.slug ?? ''
  if (impersonatedOrgId) {
    const serviceSupabase = createServiceClient()
    const { data: impOrg } = await serviceSupabase
      .from('organizations')
      .select('slug')
      .eq('id', impersonatedOrgId)
      .single()
    orgSlug = impOrg?.slug ?? ''
  }

  // Använd service-klient vid impersonering för att kringgå RLS
  const dataClient = impersonatedOrgId ? createServiceClient() : supabase

  const { data: events } = await dataClient
    .from('events')
    .select('*')
    .eq('organization_id', effectiveOrgId)
    .order('created_at', { ascending: false })

  // Participant counts per event
  const counts: Record<string, { total: number; checkedIn: number }> = {}
  if (events?.length) {
    const { data: rows } = await dataClient
      .from('participants')
      .select('event_id, checked_in_at')
      .in('event_id', events.map((e) => e.id))

    for (const row of rows ?? []) {
      if (!counts[row.event_id]) counts[row.event_id] = { total: 0, checkedIn: 0 }
      counts[row.event_id].total++
      if (row.checked_in_at) counts[row.event_id].checkedIn++
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mina event</h1>
          <p className="text-gray-500 mt-1">Hantera event och deltagarregistreringar</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Skapa event
        </Link>
      </div>

      {!events?.length ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-16 text-center">
          <p className="text-5xl mb-4">📅</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Inga event ännu</h2>
          <p className="text-gray-500 mb-6">Skapa ditt första event för att komma igång</p>
          <Link
            href="/dashboard/events/new"
            className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Skapa event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Titel
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Datum
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Deltagare
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => {
                const c = counts[event.id] ?? { total: 0, checkedIn: 0 }
                return (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      {event.location && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
                          {event.location}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_STATUS_COLORS[event.status]}`}
                      >
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatShortDate(event.starts_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.checkedIn}/{c.total}
                      {event.max_participants ? ` (max ${event.max_participants})` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        <EventStatusButton eventId={event.id} status={event.status} />
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="text-xs text-gray-600 hover:text-brand px-2 py-1 rounded hover:bg-brand-subtle transition-colors"
                        >
                          Redigera
                        </Link>
                        <Link
                          href={`/dashboard/events/${event.id}/fields`}
                          className="text-xs text-gray-600 hover:text-brand px-2 py-1 rounded hover:bg-brand-subtle transition-colors"
                        >
                          Formulär
                        </Link>
                        <Link
                          href={`/dashboard/events/${event.id}/participants`}
                          className="text-xs text-gray-600 hover:text-brand px-2 py-1 rounded hover:bg-brand-subtle transition-colors"
                        >
                          Deltagare
                        </Link>
                        <Link
                          href={`/checkin/${event.checkin_token}`}
                          className="text-xs bg-brand text-white px-2 py-1 rounded hover:opacity-90 transition-opacity"
                        >
                          Incheckning
                        </Link>
                        {orgSlug && (
                          <Link
                            href={`/${orgSlug}/${event.id}`}
                            target="_blank"
                            className="text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                          >
                            Anmälan ↗
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
