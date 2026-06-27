import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej behörig.' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Ej behörig.' }, { status: 403 })
  }

  const impersonatedOrgId = userData.role === 'superadmin' ? await getImpersonatedOrgId() : null
  const effectiveOrgId = impersonatedOrgId ?? userData.organization_id
  const serviceClient = createServiceClient()

  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('id, event:events(organization_id)')
    .eq('id', id)
    .single()

  if (!exhibitor) return NextResponse.json({ error: 'Utställaren hittades inte.' }, { status: 404 })

  const eventOrg = (exhibitor.event as any)?.organization_id
  if (userData.role !== 'superadmin' && eventOrg !== effectiveOrgId) {
    return NextResponse.json({ error: 'Ej behörig.' }, { status: 403 })
  }

  const body = await request.json()

  const updates: Record<string, unknown> = {
    map_x: body.map_x ?? null,
    map_y: body.map_y ?? null,
    map_w: body.map_w ?? null,
    map_h: body.map_h ?? null,
    map_color: body.map_color ?? null,
  }
  if ('assigned_preset_id' in body) {
    updates.assigned_preset_id = body.assigned_preset_id ?? null
  }

  const { error } = await serviceClient
    .from('exhibitors')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Kunde inte spara position.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
