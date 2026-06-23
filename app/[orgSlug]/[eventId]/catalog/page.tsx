import { notFound } from 'next/navigation'
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
    .select('id, name, primary_color')
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
  if (token) {
    const { data: participant } = await serviceClient
      .from('participants')
      .select('id')
      .eq('qr_code', token)
      .eq('event_id', eventId)
      .maybeSingle()
    isUnlocked = !!participant
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
    />
  )
}
