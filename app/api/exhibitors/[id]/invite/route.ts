import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendExhibitorInviteEmail } from '@/lib/email'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej behörig.' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*, event:events(title, primary_color)')
    .eq('id', id)
    .single()

  if (!exhibitor) return NextResponse.json({ error: 'Utställaren hittades inte.' }, { status: 404 })
  if (!exhibitor.email) return NextResponse.json({ error: 'Ingen e-postadress angiven.' }, { status: 400 })

  const event = exhibitor.event as any
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  await sendExhibitorInviteEmail({
    to: exhibitor.email,
    companyName: exhibitor.company_name,
    eventTitle: event?.title ?? '',
    editToken: exhibitor.edit_token,
    appUrl,
    brandColor: event?.primary_color ?? '#172554',
  })

  return NextResponse.json({ success: true })
}
