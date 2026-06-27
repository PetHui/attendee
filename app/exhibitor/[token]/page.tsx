import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import ExhibitorPortal from '@/components/exhibitor/exhibitor-portal'

export default async function ExhibitorPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const serviceClient = createServiceClient()

  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*, event:events(id, title, starts_at, ends_at, location, primary_color, organization:organizations(primary_color))')
    .eq('edit_token', token)
    .single()

  if (!exhibitor) notFound()

  const [{ data: contacts }, { data: billing }, { data: offers }] = await Promise.all([
    serviceClient
      .from('exhibitor_contacts')
      .select('*')
      .eq('exhibitor_id', exhibitor.id)
      .order('is_primary', { ascending: false }),
    serviceClient
      .from('exhibitor_billing')
      .select('*')
      .eq('exhibitor_id', exhibitor.id)
      .maybeSingle(),
    serviceClient
      .from('exhibitor_offers')
      .select('*, redemptions:offer_redemptions(id, participant_id, redeemed_at)')
      .eq('exhibitor_id', exhibitor.id),
  ])

  // Fetch participant names for existing redemptions
  const allRedemptions = (offers ?? []).flatMap((o: any) => o.redemptions ?? [])
  const participantIds = [...new Set(allRedemptions.map((r: any) => r.participant_id as string))]
  const nameMap: Record<string, string> = {}
  if (participantIds.length > 0) {
    const { data: fieldValues } = await serviceClient
      .from('participant_field_values')
      .select('participant_id, value, registration_fields(label)')
      .in('participant_id', participantIds)
    for (const fv of fieldValues ?? []) {
      const label = (fv as any).registration_fields?.label?.toLowerCase() ?? ''
      if (['förnamn', 'efternamn', 'namn', 'name'].some((kw) => label.includes(kw))) {
        if (!nameMap[fv.participant_id]) nameMap[fv.participant_id] = fv.value
      }
    }
  }

  const enrichedOffers = (offers ?? []).map((o: any) => ({
    ...o,
    redemptions: (o.redemptions ?? []).map((r: any) => ({
      ...r,
      name: nameMap[r.participant_id] ?? undefined,
    })),
  }))

  const ev = (exhibitor as any).event
  const brandColor = ev?.primary_color ?? ev?.organization?.primary_color ?? '#172554'

  return (
    <ExhibitorPortal
      exhibitor={exhibitor}
      event={ev}
      contacts={contacts ?? []}
      billing={billing ?? null}
      offers={enrichedOffers}
      editToken={token}
      brandColor={brandColor}
    />
  )
}
