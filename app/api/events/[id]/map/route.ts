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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedEvent(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await request.json()
  const { serviceClient } = result

  const { error } = await serviceClient
    .from('events')
    .update({
      map_image_url: body.map_image_url ?? null,
      map_aspect_ratio: body.map_aspect_ratio ?? 1.5,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Kunde inte spara kartinställningar.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
