import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
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

  const { orgName, orgSlug, adminName, adminEmail, adminPassword } = await request.json()

  if (!orgName || !orgSlug || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Alla fält är obligatoriska.' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(orgSlug)) {
    return NextResponse.json(
      { error: 'Slug får bara innehålla gemener, siffror och bindestreck.' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Check slug uniqueness
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .maybeSingle()

  if (existingOrg) {
    return NextResponse.json({ error: 'Slug är redan tagen.' }, { status: 409 })
  }

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug: orgSlug })
    .select()
    .single()

  if (orgError || !org) {
    return NextResponse.json(
      { error: orgError?.message ?? 'Kunde inte skapa organisation.' },
      { status: 500 }
    )
  }

  // 2. Create auth user via Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    // Roll back organization
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json(
      { error: authError?.message ?? 'Kunde inte skapa användare.' },
      { status: 500 }
    )
  }

  // 3. Create users row with owner role
  const { error: userRowError } = await supabase.from('users').insert({
    id: authData.user.id,
    organization_id: org.id,
    role: 'owner',
    email: adminEmail,
    name: adminName,
  })

  if (userRowError) {
    // Roll back auth user and organization
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json(
      { error: userRowError.message ?? 'Kunde inte skapa användarprofil.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, organizationId: org.id })
}
