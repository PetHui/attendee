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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  const { id, elementId } = await params
  const result = await getAuthorized(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await request.json()
  const { error } = await result.serviceClient
    .from('map_elements')
    .update({
      label: body.label,
      x: body.x,
      y: body.y,
      w: body.w,
      h: body.h,
      font_size: body.font_size,
      text_color: body.text_color,
      bg_color: body.bg_color ?? null,
      bold: body.bold,
      border_color: body.border_color ?? null,
    })
    .eq('id', elementId)
    .eq('event_id', id)

  if (error) return NextResponse.json({ error: 'Kunde inte uppdatera element.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  const { id, elementId } = await params
  const result = await getAuthorized(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  await result.serviceClient
    .from('map_elements')
    .delete()
    .eq('id', elementId)
    .eq('event_id', id)

  return NextResponse.json({ success: true })
}
