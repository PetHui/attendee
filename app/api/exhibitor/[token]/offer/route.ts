import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PUT(
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

  const { data: existing } = await serviceClient
    .from('exhibitor_offers')
    .select('id')
    .eq('exhibitor_id', exhibitor.id)
    .maybeSingle()

  let offer
  if (existing) {
    const { data } = await serviceClient
      .from('exhibitor_offers')
      .update({ title: body.title, description: body.description || null })
      .eq('id', existing.id)
      .select()
      .single()
    offer = data
  } else {
    if (!body.title?.trim()) return NextResponse.json({ success: true })
    const { data } = await serviceClient
      .from('exhibitor_offers')
      .insert({ exhibitor_id: exhibitor.id, title: body.title.trim(), description: body.description || null })
      .select()
      .single()
    offer = data
  }

  return NextResponse.json({ success: true, offer })
}
