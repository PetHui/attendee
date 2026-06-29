import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const service = createServiceClient()

  // Verify participant belongs to user's org
  const { data: participant } = await service
    .from('participants')
    .select('id, event:events(organization_id)')
    .eq('id', id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Deltagare hittades inte.' }, { status: 404 })
  if ((participant.event as any)?.organization_id !== userData.organization_id) {
    return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })
  }

  const { fieldValues } = await request.json() as { fieldValues: Record<string, string> }
  const fieldIds = Object.keys(fieldValues)

  if (fieldIds.length > 0) {
    await service
      .from('participant_field_values')
      .delete()
      .eq('participant_id', id)
      .in('field_id', fieldIds)

    await service.from('participant_field_values').insert(
      fieldIds.map((fieldId) => ({
        participant_id: id,
        field_id: fieldId,
        value: fieldValues[fieldId],
      }))
    )
  }

  return NextResponse.json({ success: true })
}
