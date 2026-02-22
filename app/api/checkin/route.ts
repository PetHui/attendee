import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify auth
  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { qrCode } = await request.json()
  if (!qrCode) return NextResponse.json({ error: 'QR-kod saknas' }, { status: 400 })

  // Get user's organization
  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const supabase = createServiceClient()

  // Find participant by QR code with nested data
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

  // Security: verify event belongs to user's org
  if ((participant.event as any).organization_id !== userData.organization_id) {
    return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })
  }

  const alreadyCheckedIn = !!participant.checked_in_at

  // Mark as checked in if not already
  if (!alreadyCheckedIn) {
    await supabase
      .from('participants')
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
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
