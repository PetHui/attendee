import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

async function getAuthorizedEvent(eventId: string) {
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedEvent(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { data } = await result.serviceClient
    .from('map_elements')
    .select('*')
    .eq('event_id', id)
    .order('created_at')

  return NextResponse.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedEvent(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await request.json()
  const { data, error } = await result.serviceClient
    .from('map_elements')
    .insert({
      event_id: id,
      label: body.label,
      x: body.x ?? 10,
      y: body.y ?? 10,
      w: body.w ?? 15,
      h: body.h ?? 5,
      font_size: body.font_size ?? 'sm',
      text_color: body.text_color ?? '#374151',
      bg_color: body.bg_color ?? null,
      bold: body.bold ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Kunde inte skapa element.' }, { status: 500 })

  return NextResponse.json(data)
}
