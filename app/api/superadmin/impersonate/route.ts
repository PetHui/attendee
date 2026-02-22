import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')

  if (!orgId) {
    return NextResponse.redirect(new URL('/superadmin', request.url))
  }

  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: userData } = await authSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verify org exists
  const supabase = createServiceClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single()

  if (!org) {
    return NextResponse.redirect(new URL('/superadmin', request.url))
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set('impersonated_org_id', orgId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 timmar
  })

  return response
}
