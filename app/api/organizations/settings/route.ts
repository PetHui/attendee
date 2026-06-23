import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Saknar behörighet' }, { status: 403 })
  }

  const { primary_color, name, orgId: bodyOrgId } = await request.json()

  const isSuperadmin = userData.role === 'superadmin'
  const effectiveOrgId = isSuperadmin ? bodyOrgId : userData.organization_id

  if (!effectiveOrgId) {
    return NextResponse.json({ error: 'Ingen organisation vald.' }, { status: 400 })
  }

  // Namnbyte är bara tillåtet för superadmin
  if (name !== undefined && !isSuperadmin) {
    return NextResponse.json({ error: 'Saknar behörighet att byta namn.' }, { status: 403 })
  }

  if (primary_color && !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    return NextResponse.json({ error: 'Ogiltig hexkod.' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (primary_color) updates.primary_color = primary_color
  if (name?.trim() && isSuperadmin) updates.name = name.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Inget att uppdatera.' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()
  const { error } = await serviceSupabase
    .from('organizations')
    .update(updates)
    .eq('id', effectiveOrgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
