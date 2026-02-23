import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const supabase = createServiceClient()

  // Verify event belongs to the user's organization
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event hittades inte' }, { status: 404 })

  const { data: updated, error } = await supabase
    .from('events')
    .update({ checkin_token: crypto.randomUUID() })
    .eq('id', id)
    .select('checkin_token')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'Kunde inte regenerera token' }, { status: 500 })
  }

  return NextResponse.json({ checkin_token: updated.checkin_token })
}
