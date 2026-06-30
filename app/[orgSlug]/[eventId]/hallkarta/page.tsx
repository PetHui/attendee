import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import MapView from '@/components/catalog/map-view'

export default async function HallkartaPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>
  searchParams: Promise<{ embed?: string }>
}) {
  const { orgSlug, eventId } = await params
  const { embed } = await searchParams
  const isEmbed = embed === 'true'

  const serviceClient = createServiceClient()

  const { data: org } = await serviceClient
    .from('organizations')
    .select('id, name, slug, primary_color')
    .eq('slug', orgSlug)
    .single()

  if (!org) notFound()

  const { data: event } = await serviceClient
    .from('events')
    .select('id, title, map_image_url, map_aspect_ratio, primary_color')
    .eq('id', eventId)
    .eq('organization_id', org.id)
    .single()

  if (!event || !event.map_image_url) notFound()

  const { data: exhibitors } = await serviceClient
    .from('exhibitors')
    .select('id, company_name, description, website, email, phone, booth_number, map_x, map_y, map_w, map_h, map_color, exhibitor_offers(id, title, description)')
    .eq('event_id', eventId)
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at')

  const { data: mapElements } = await serviceClient
    .from('map_elements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  const brand = event.primary_color ?? org.primary_color ?? '#172554'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isEmbed && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: brand }}
          />
          <span className="text-sm font-semibold text-gray-800">{event.title} — Hallkarta</span>
        </div>
      )}
      <div className="flex-1 p-4">
        <MapView
          exhibitors={exhibitors ?? []}
          mapElements={mapElements ?? []}
          mapImageUrl={event.map_image_url}
          mapAspectRatio={event.map_aspect_ratio ?? 1.5}
          org={org}
          eventId={event.id}
          brand={brand}
        />
      </div>
    </div>
  )
}
