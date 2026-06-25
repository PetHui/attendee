import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function normalizeUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

async function getExhibitorByToken(token: string) {
  const serviceClient = createServiceClient()
  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*')
    .eq('edit_token', token)
    .single()
  return { exhibitor, serviceClient }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { exhibitor } = await getExhibitorByToken(token)
  if (!exhibitor) return NextResponse.json({ error: 'Hittades inte.' }, { status: 404 })
  return NextResponse.json({ exhibitor })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { exhibitor, serviceClient } = await getExhibitorByToken(token)
  if (!exhibitor) return NextResponse.json({ error: 'Hittades inte.' }, { status: 404 })

  const body = await request.json()

  await serviceClient
    .from('exhibitors')
    .update({
      company_name: body.company_name || exhibitor.company_name,
      description: body.description || null,
      website: normalizeUrl(body.website),
      email: body.email || null,
      phone: body.phone || null,
      booth_number: body.booth_number || null,
      status: body.status ?? exhibitor.status,
    })
    .eq('id', exhibitor.id)

  return NextResponse.json({ success: true })
}
