import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendExhibitorInviteEmail } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej behörig.' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Ej behörig.' }, { status: 403 })
  }

  const body = await request.json()
  const { event_id, company_name, email, booth_number } = body

  if (!company_name?.trim()) {
    return NextResponse.json({ error: 'Företagsnamn krävs.' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Verify event belongs to the user's org (or superadmin)
  const { data: event } = await serviceClient
    .from('events')
    .select('id, title, organization_id')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Eventet hittades inte.' }, { status: 404 })

  if (userData.role !== 'superadmin' && event.organization_id !== userData.organization_id) {
    return NextResponse.json({ error: 'Ej behörig.' }, { status: 403 })
  }

  const { data: exhibitor, error } = await serviceClient
    .from('exhibitors')
    .insert({
      event_id,
      company_name: company_name.trim(),
      email: email?.trim() || null,
      booth_number: booth_number?.trim() || null,
    })
    .select()
    .single()

  if (error || !exhibitor) {
    return NextResponse.json({ error: 'Kunde inte skapa utställare.' }, { status: 500 })
  }

  // Send invite email if address provided
  if (email?.trim()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    try {
      await sendExhibitorInviteEmail({
        to: email.trim(),
        companyName: company_name.trim(),
        eventTitle: event.title,
        editToken: exhibitor.edit_token,
        appUrl,
      })
    } catch (err) {
      console.error('[email] Failed to send exhibitor invite:', err)
    }
  }

  return NextResponse.json({ exhibitor })
}
