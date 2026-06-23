import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const serviceClient = createServiceClient()

  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('id')
    .eq('edit_token', token)
    .single()

  if (!exhibitor) return NextResponse.json({ error: 'Hittades inte.' }, { status: 404 })

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Namn krävs.' }, { status: 400 })

  const { data: contact, error } = await serviceClient
    .from('exhibitor_contacts')
    .insert({
      exhibitor_id: exhibitor.id,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      role: body.role?.trim() || null,
      is_primary: body.is_primary ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Kunde inte lägga till kontakt.' }, { status: 500 })

  return NextResponse.json({ contact })
}
