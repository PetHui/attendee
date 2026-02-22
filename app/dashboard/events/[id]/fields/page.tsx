import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FieldBuilder from '@/components/dashboard/field-builder'
import Link from 'next/link'

export default async function FieldsPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          ← Tillbaka till event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Anmälningsformulär</h1>
        <p className="text-gray-500 mt-1">{event.title}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-5">
          Dra och släpp fälten för att ändra ordning. Klicka på{' '}
          <strong>Spara formulär</strong> när du är klar.
        </p>
        <FieldBuilder eventId={id} initialFields={fields ?? []} />
      </div>
    </div>
  )
}
