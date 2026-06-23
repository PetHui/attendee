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
    .select('*, event:events(id, title, starts_at, ends_at, location)')
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

  return (
    <ExhibitorPortal
      exhibitor={exhibitor}
      event={(exhibitor as any).event}
      contacts={contacts ?? []}
      billing={billing ?? null}
      offers={offers ?? []}
      editToken={token}
    />
  )
}
