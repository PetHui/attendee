import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: organizationId, userId } = await params

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

  const supabase = createServiceClient()

  // Verify the user belongs to the given organization
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .eq('organization_id', organizationId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'Användaren hittades inte.' }, { status: 404 })
  }

  if (targetUser.role === 'superadmin') {
    return NextResponse.json({ error: 'Superadmin-konton kan inte tas bort.' }, { status: 403 })
  }

  // Delete the users row first (FK constraint), then the auth user
  const { error: rowError } = await supabase.from('users').delete().eq('id', userId)
  if (rowError) {
    return NextResponse.json({ error: rowError.message }, { status: 500 })
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
