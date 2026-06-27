import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { qrCode, shortCode, editToken } = await request.json()

  if ((!qrCode && !shortCode) || !editToken) {
    return NextResponse.json({ error: 'Saknade parametrar.' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Find exhibitor by edit_token
  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('id, event_id')
    .eq('edit_token', editToken)
    .single()

  if (!exhibitor) {
    return NextResponse.json({ error: 'Utställaren hittades inte.' }, { status: 404 })
  }

  // Find offer for this exhibitor
  const { data: offer } = await serviceClient
    .from('exhibitor_offers')
    .select('id')
    .eq('exhibitor_id', exhibitor.id)
    .maybeSingle()

  if (!offer) {
    return NextResponse.json({ error: 'Inget erbjudande konfigurerat.' }, { status: 404 })
  }

  // Find participant by QR code or short code (must belong to same event)
  let participantQuery = serviceClient
    .from('participants')
    .select('id, participant_field_values(value, registration_fields(label))')
    .eq('event_id', exhibitor.event_id)

  if (qrCode) {
    participantQuery = participantQuery.eq('qr_code', qrCode)
  } else {
    participantQuery = participantQuery.ilike('qr_code', `${shortCode.toLowerCase()}%`)
  }

  const { data: participant } = await participantQuery.single()

  if (!participant) {
    return NextResponse.json({ error: 'Ogiltig kod eller fel evenemang.' }, { status: 404 })
  }

  // Check for existing redemption
  const { data: existing } = await serviceClient
    .from('offer_redemptions')
    .select('id')
    .eq('offer_id', offer.id)
    .eq('participant_id', participant.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ alreadyRedeemed: true, participantId: participant.id })
  }

  // Create redemption
  const { data: redemption } = await serviceClient
    .from('offer_redemptions')
    .insert({ offer_id: offer.id, participant_id: participant.id })
    .select()
    .single()

  // Try to extract participant name
  const fieldValues = (participant as any).participant_field_values ?? []
  const nameField = fieldValues.find((fv: any) =>
    ['förnamn', 'efternamn', 'namn', 'name'].some((kw: string) =>
      fv.registration_fields?.label?.toLowerCase().includes(kw)
    )
  )
  const name = nameField?.value ?? null

  return NextResponse.json({
    alreadyRedeemed: false,
    redemptionId: redemption?.id,
    participantId: participant.id,
    name,
  })
}
