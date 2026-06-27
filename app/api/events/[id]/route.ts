import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('events')
    .select('title, checkin_token')
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const body = await request.json()
  const { organization_id: _orgId, ...updateData } = body

  let data, error

  if (userData?.role === 'superadmin') {
    const impersonatedOrgId = await getImpersonatedOrgId()
    if (!impersonatedOrgId) {
      return NextResponse.json({ error: 'Ingen impersonerad organisation' }, { status: 403 })
    }
    const serviceSupabase = createServiceClient()
    ;({ data, error } = await serviceSupabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', impersonatedOrgId)
      .select()
      .single())
  } else {
    ;({ data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
