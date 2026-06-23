'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function impersonateOrg(orgId: string) {
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await authSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'superadmin') redirect('/dashboard')

  const supabase = createServiceClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single()

  if (!org) redirect('/superadmin')

  const cookieStore = await cookies()
  cookieStore.set('impersonated_org_id', orgId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  })

  redirect('/dashboard')
}
