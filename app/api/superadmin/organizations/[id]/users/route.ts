import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params

  // Verify auth and superadmin role
  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
  }

  const { data: userData } = await authSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'superadmin') {
    return NextResponse.json({ error: 'Saknar behörighet' }, { status: 403 })
  }

  const { name, email, password, role } = await request.json()

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Alla fält är obligatoriska.' }, { status: 400 })
  }

  if (!['owner', 'admin', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Ogiltig roll.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify organization exists
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organisationen hittades inte.' }, { status: 404 })
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Kunde inte skapa användare.' },
      { status: 500 }
    )
  }

  // Create users row
  const { error: userRowError } = await supabase.from('users').insert({
    id: authData.user.id,
    organization_id: organizationId,
    role,
    email,
    name,
  })

  if (userRowError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: userRowError.message ?? 'Kunde inte skapa användarprofil.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
