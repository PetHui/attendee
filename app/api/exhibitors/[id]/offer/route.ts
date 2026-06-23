import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const serviceClient = createServiceClient()

  const { data: existing } = await serviceClient
    .from('exhibitor_offers')
    .select('id')
    .eq('exhibitor_id', id)
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
      .insert({ exhibitor_id: id, title: body.title.trim(), description: body.description || null })
      .select()
      .single()
    offer = data
  }

  return NextResponse.json({ success: true, offer })
}
