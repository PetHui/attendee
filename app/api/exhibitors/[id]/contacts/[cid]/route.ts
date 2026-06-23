import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const { cid } = await params
  const serviceClient = createServiceClient()
  await serviceClient.from('exhibitor_contacts').delete().eq('id', cid)
  return NextResponse.json({ success: true })
}
