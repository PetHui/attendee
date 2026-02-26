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

  // Separera befintliga fält (riktiga UUID:n) från nya (temp-ID:n som börjar med "new-")
  const existingFields = fields.filter((f: any) => !String(f.id).startsWith('new-'))
  const newFields = fields.filter((f: any) => String(f.id).startsWith('new-'))
  const keptIds = existingFields.map((f: any) => f.id)

  // Ta bort fält som raderades i formulärbyggaren
  const { data: currentFields } = await dataClient
    .from('registration_fields')
    .select('id')
    .eq('event_id', id)

  const idsToDelete = (currentFields ?? [])
    .map((f) => f.id)
    .filter((fid) => !keptIds.includes(fid))

  if (idsToDelete.length > 0) {
    await dataClient.from('registration_fields').delete().in('id', idsToDelete)
  }

  // Uppdatera befintliga fält (behåller UUID:n så att deltagardata inte bryts)
  for (const f of existingFields) {
    const sortOrder = fields.findIndex((ff: any) => ff.id === f.id)
    const { error } = await dataClient
      .from('registration_fields')
      .update({
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        options: f.options?.length > 0 ? f.options : null,
        sort_order: sortOrder,
      })
      .eq('id', f.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Infoga nya fält
  if (newFields.length > 0) {
    const toInsert = newFields.map((f: any) => ({
      event_id: id,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      options: f.options?.length > 0 ? f.options : null,
      sort_order: fields.findIndex((ff: any) => ff.id === f.id),
    }))
    const { error } = await dataClient.from('registration_fields').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
