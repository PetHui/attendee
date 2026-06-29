import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

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
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const effectiveOrgId =
    userData.role === 'superadmin'
      ? await getImpersonatedOrgId()
      : userData.organization_id

  if (!effectiveOrgId) return NextResponse.json({ error: 'Ingen aktiv organisation.' }, { status: 403 })

  const service = createServiceClient()

  // Verify participant belongs to the effective org
  const { data: participant } = await service
    .from('participants')
    .select('id, event_id')
    .eq('id', id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Deltagare hittades inte.' }, { status: 404 })

  const { data: event } = await service
    .from('events')
    .select('id')
    .eq('id', participant.event_id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })

  const { fieldValues } = await request.json() as { fieldValues: Record<string, string> }
  const fieldIds = Object.keys(fieldValues)

  if (fieldIds.length > 0) {
    const { error: deleteError } = await service
      .from('participant_field_values')
      .delete()
      .eq('participant_id', id)
      .in('field_id', fieldIds)

    if (deleteError) {
      console.error('[participants PUT] delete error:', deleteError)
      return NextResponse.json({ error: 'Kunde inte uppdatera deltagaren.' }, { status: 500 })
    }

    const { error: insertError } = await service
      .from('participant_field_values')
      .insert(
        fieldIds.map((fieldId) => ({
          participant_id: id,
          field_id: fieldId,
          value: fieldValues[fieldId],
        }))
      )

    if (insertError) {
      console.error('[participants PUT] insert error:', insertError)
      return NextResponse.json({ error: 'Kunde inte uppdatera deltagaren.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const effectiveOrgId =
    userData.role === 'superadmin'
      ? await getImpersonatedOrgId()
      : userData.organization_id

  if (!effectiveOrgId) return NextResponse.json({ error: 'Ingen aktiv organisation.' }, { status: 403 })

  const service = createServiceClient()

  const { data: participant } = await service
    .from('participants')
    .select('id, event_id')
    .eq('id', id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Deltagare hittades inte.' }, { status: 404 })

  const { data: event } = await service
    .from('events')
    .select('id')
    .eq('id', participant.event_id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })

  const { error } = await service.from('participants').delete().eq('id', id)

  if (error) {
    console.error('[participants DELETE] error:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort deltagaren.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
