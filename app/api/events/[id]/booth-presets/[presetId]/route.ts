import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

async function getAuthorized(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ej behörig.', status: 401 }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return { error: 'Ej behörig.', status: 403 }
  }

  const impersonatedOrgId = userData.role === 'superadmin' ? await getImpersonatedOrgId() : null
  const effectiveOrgId = impersonatedOrgId ?? userData.organization_id
  const serviceClient = createServiceClient()

  const { data: event } = await serviceClient
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) return { error: 'Eventet hittades inte.', status: 404 }

  return { serviceClient }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; presetId: string }> }
) {
  const { id, presetId } = await params
  const result = await getAuthorized(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await request.json()
  const { serviceClient } = result

  const { error } = await serviceClient
    .from('booth_size_presets')
    .update({
      name: body.name,
      width_pct: body.width_pct,
      height_pct: body.height_pct,
      color: body.color,
      sort_order: body.sort_order ?? 0,
    })
    .eq('id', presetId)
    .eq('event_id', id)

  if (error) return NextResponse.json({ error: 'Kunde inte uppdatera preset.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; presetId: string }> }
) {
  const { id, presetId } = await params
  const result = await getAuthorized(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { serviceClient } = result
  await serviceClient
    .from('booth_size_presets')
    .delete()
    .eq('id', presetId)
    .eq('event_id', id)

  return NextResponse.json({ success: true })
}
