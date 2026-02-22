import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { participantId } = await request.json()
  if (!participantId) return NextResponse.json({ error: 'participantId saknas' }, { status: 400 })

  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const supabase = createServiceClient()

  // Verify participant belongs to user's org
  const { data: participant } = await supabase
    .from('participants')
    .select('id, event:events(organization_id)')
    .eq('id', participantId)
    .single()

  if (!participant) return NextResponse.json({ error: 'Deltagare hittades inte' }, { status: 404 })

  if ((participant.event as any).organization_id !== userData.organization_id) {
    return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })
  }

  await supabase
    .from('participants')
    .update({ checked_in_at: null, checked_in_by: null })
    .eq('id', participantId)

  return NextResponse.json({ success: true })
}
