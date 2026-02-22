import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  if (!userData || !['owner', 'admin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Saknar behörighet' }, { status: 403 })
  }

  const { primary_color } = await request.json()

  if (!primary_color || !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    return NextResponse.json({ error: 'Ogiltig hexkod.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('organizations')
    .update({ primary_color })
    .eq('id', userData.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
