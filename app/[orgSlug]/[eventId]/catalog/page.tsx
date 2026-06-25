import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createServiceClient } from '@/lib/supabase/server'
import ExhibitorCatalog from '@/components/catalog/exhibitor-catalog'

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { orgSlug, eventId } = await params
  const { token } = await searchParams

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
    .select('id, title, starts_at, ends_at, location, status')
    .eq('id', eventId)
    .eq('organization_id', org.id)
    .single()

  if (!event) notFound()

  // Validate token (participant's QR code in this event)
  let isUnlocked = false
  let qrCodeBase64: string | undefined
  if (token) {
    const { data: participant } = await serviceClient
      .from('participants')
      .select('id')
      .eq('qr_code', token)
      .eq('event_id', eventId)
      .maybeSingle()
    isUnlocked = !!participant
    if (isUnlocked) {
      const buf = await QRCode.toBuffer(token, { width: 300, margin: 2 })
      qrCodeBase64 = `data:image/png;base64,${buf.toString('base64')}`
    }
  }

  // Load published exhibitors (always, so teaser can show count)
  const { data: exhibitors } = await serviceClient
    .from('exhibitors')
    .select('id, company_name, description, website, email, phone, booth_number, exhibitor_offers(id, title, description)')
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
    />
  )
}
