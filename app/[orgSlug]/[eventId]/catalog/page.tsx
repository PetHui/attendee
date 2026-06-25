import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createServiceClient } from '@/lib/supabase/server'
import ExhibitorCatalog from '@/components/catalog/exhibitor-catalog'

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>
  searchParams: Promise<{ token?: string; tab?: string; highlight?: string }>
}) {
  const { orgSlug, eventId } = await params
  const { token, tab, highlight } = await searchParams

  const serviceClient = createServiceClient()

  // Verify org and event
  const { data: org } = await serviceClient
    .from('organizations')
    .select('id, name, slug, primary_color')
    .eq('slug', orgSlug)
    .single()

  if (!org) notFound()

  const { data: event } = await serviceClient
    .from('events')
    .select('id, title, starts_at, ends_at, location, status, map_image_url, map_aspect_ratio')
    .eq('id', eventId)
    .eq('organization_id', org.id)
    .single()

  if (!event) notFound()

  // Validate token (participant's QR code in this event)
  let isUnlocked = false
  let qrCodeBase64: string | undefined
  let participantName: string | undefined
  if (token) {
    const { data: participant } = await serviceClient
      .from('participants')
      .select('id, participant_field_values(value, registration_fields(label, sort_order))')
      .eq('qr_code', token)
      .eq('event_id', eventId)
      .maybeSingle()
    isUnlocked = !!participant
    if (isUnlocked && participant) {
      const buf = await QRCode.toBuffer(token, { width: 300, margin: 2 })
      qrCodeBase64 = `data:image/png;base64,${buf.toString('base64')}`

      const nameKeywords = ['förnamn', 'efternamn', 'namn', 'name']
      type FieldValue = { value: string; registration_fields: { label: string; sort_order: number } | { label: string; sort_order: number }[] | null }
      const nameValues = (participant.participant_field_values as unknown as FieldValue[])
        .map((fv) => {
          const rf = Array.isArray(fv.registration_fields) ? fv.registration_fields[0] : fv.registration_fields
          return { value: fv.value, rf }
        })
        .filter(({ rf }) => rf && nameKeywords.some((kw) => rf.label.toLowerCase().includes(kw)))
        .sort((a, b) => (a.rf!.sort_order ?? 0) - (b.rf!.sort_order ?? 0))
        .map(({ value }) => value)
        .filter(Boolean)
      participantName = nameValues.length ? nameValues.join(' ') : undefined
    }
  }

  // Load map elements
  const { data: mapElements } = await serviceClient
    .from('map_elements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  // Load published exhibitors (always, so teaser can show count)
  const { data: exhibitors } = await serviceClient
    .from('exhibitors')
    .select('id, company_name, description, website, email, phone, booth_number, map_x, map_y, map_w, map_h, map_color, exhibitor_offers(id, title, description)')
    .eq('event_id', eventId)
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at')

  const registrationUrl = `/${orgSlug}/${eventId}`

  return (
    <ExhibitorCatalog
      event={event}
      org={org}
      exhibitors={exhibitors ?? []}
      isUnlocked={isUnlocked}
      registrationUrl={registrationUrl}
      token={token}
      qrCodeBase64={qrCodeBase64}
      participantName={participantName}
      mapImageUrl={event?.map_image_url ?? null}
      mapAspectRatio={event?.map_aspect_ratio ?? 1.5}
      mapElements={mapElements ?? []}
      initialTab={tab === 'karta' ? 'karta' : 'lista'}
      highlightExhibitorId={highlight}
    />
  )
}
