import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

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

  let effectiveOrgId = userData.organization_id
  if (userData.role === 'superadmin') {
    const impersonatedId = await getImpersonatedOrgId()
    if (!impersonatedId) {
      return NextResponse.json({ error: 'Ingen organisation vald.' }, { status: 400 })
    }
    effectiveOrgId = impersonatedId
  }

  const { primary_color } = await request.json()

  if (!primary_color || !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    return NextResponse.json({ error: 'Ogiltig hexkod.' }, { status: 400 })
  }

  // Använd service client för att kunna uppdatera vilken org som helst
  const serviceSupabase = createServiceClient()
  const { error } = await serviceSupabase
    .from('organizations')
    .update({ primary_color })
    .eq('id', effectiveOrgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
