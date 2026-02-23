import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { qrCode, checkinToken } = await request.json()

  if (!qrCode || !checkinToken) {
    return NextResponse.json({ error: 'QR-kod eller token saknas' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the checkin token is valid and get the event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('checkin_token', checkinToken)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Ogiltig incheckning-token.' }, { status: 403 })
  }

  // Find participant by QR code
  const { data: participant, error } = await supabase
    .from('participants')
    .select(
      `
      *,
      event:events(*),
      field_values:participant_field_values(
        *,
        field:registration_fields(label, sort_order)
      )
    `
    )
    .eq('qr_code', qrCode)
    .single()

  if (error || !participant) {
    return NextResponse.json(
      { error: 'Ingen deltagare hittades med denna QR-kod.' },
      { status: 404 }
    )
  }

  // Verify the participant belongs to the event matching the token
  if (participant.event_id !== event.id) {
    return NextResponse.json({ error: 'QR-koden tillhör inte detta event.' }, { status: 403 })
  }

  const alreadyCheckedIn = !!participant.checked_in_at

  if (!alreadyCheckedIn) {
    await supabase
      .from('participants')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('id', participant.id)
  }

  return NextResponse.json({
    success: true,
    alreadyCheckedIn,
    participant: {
      id: participant.id,
      checked_in_at: alreadyCheckedIn
        ? participant.checked_in_at
        : new Date().toISOString(),
      field_values: participant.field_values,
      event: {
        id: (participant.event as any).id,
        title: (participant.event as any).title,
      },
    },
  })
}
