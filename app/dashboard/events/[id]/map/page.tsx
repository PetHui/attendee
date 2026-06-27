import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import MapEditor from '@/components/dashboard/map-editor'
import Link from 'next/link'

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    .select('id, title, map_image_url, map_aspect_ratio')
    .eq('id', id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) notFound()

  const serviceClient = createServiceClient()

  const [{ data: exhibitors }, { data: presets }, { data: elements }] = await Promise.all([
    serviceClient
      .from('exhibitors')
      .select('id, company_name, booth_number, map_x, map_y, map_w, map_h, map_color, assigned_preset_id')
      .eq('event_id', id)
      .order('sort_order')
      .order('created_at'),
    serviceClient
      .from('booth_size_presets')
      .select('*')
      .eq('event_id', id)
      .order('sort_order'),
    serviceClient
      .from('map_elements')
      .select('*')
      .eq('event_id', id)
      .order('created_at'),
  ])

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          ← {event.title}
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Hallkarta</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <MapEditor
          eventId={id}
          mapImageUrl={event.map_image_url ?? null}
          mapAspectRatio={event.map_aspect_ratio ?? 1.5}
          exhibitors={exhibitors ?? []}
          presets={presets ?? []}
          initialElements={elements ?? []}
        />
      </div>
    </div>
  )
}
