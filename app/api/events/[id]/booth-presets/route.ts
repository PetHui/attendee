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

  return { serviceClient, eventId }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedEvent(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { serviceClient } = result
  const { data } = await serviceClient
    .from('booth_size_presets')
    .select('*')
    .eq('event_id', id)
    .order('sort_order')

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
  const { serviceClient } = result

  const { data, error } = await serviceClient
    .from('booth_size_presets')
    .insert({
      event_id: id,
      name: body.name,
      width_pct: body.width_pct,
      height_pct: body.height_pct,
      color: body.color ?? '#a8d5b5',
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Kunde inte skapa preset.' }, { status: 500 })

  return NextResponse.json(data)
}
