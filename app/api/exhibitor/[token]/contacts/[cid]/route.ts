import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string; cid: string }> }
) {
  const { token, cid } = await params
  const serviceClient = createServiceClient()

  // Verify the contact belongs to this exhibitor (via token)
  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('id')
    .eq('edit_token', token)
    .single()

  if (!exhibitor) return NextResponse.json({ error: 'Hittades inte.' }, { status: 404 })

  await serviceClient
    .from('exhibitor_contacts')
    .delete()
    .eq('id', cid)
    .eq('exhibitor_id', exhibitor.id)

  return NextResponse.json({ success: true })
}
