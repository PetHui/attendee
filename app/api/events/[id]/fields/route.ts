import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Saknar behörighet' }, { status: 403 })
  }

  const isSuperadmin = userData.role === 'superadmin'
  const impersonatedOrgId = isSuperadmin ? await getImpersonatedOrgId() : null
  const effectiveOrgId = impersonatedOrgId ?? userData.organization_id
  const dataClient = isSuperadmin ? createServiceClient() : supabase

  // Verify event belongs to org
  const { data: event } = await dataClient
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event hittades inte' }, { status: 404 })

  const { fields } = await request.json()

  // Replace all fields
  await dataClient.from('registration_fields').delete().eq('event_id', id)

  if (fields.length > 0) {
    const toInsert = fields.map((f: any, idx: number) => ({
      event_id: id,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      options: f.options?.length > 0 ? f.options : null,
      sort_order: idx,
    }))

    const { error } = await dataClient.from('registration_fields').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
