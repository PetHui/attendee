import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

export async function POST(request: Request) {
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

  let effectiveOrgId = userData.organization_id
  if (userData.role === 'superadmin') {
    const impersonatedId = await getImpersonatedOrgId()
    if (!impersonatedId) {
      return NextResponse.json({ error: 'Ingen organisation vald.' }, { status: 400 })
    }
    effectiveOrgId = impersonatedId
  }

  const body = await request.json()
  const { organization_id: _orgId, ...fields } = body

  const { data, error } = await supabase
    .from('events')
    .insert({ ...fields, organization_id: effectiveOrgId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
