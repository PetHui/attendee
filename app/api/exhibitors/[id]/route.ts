import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendExhibitorInviteEmail } from '@/lib/email'

function normalizeUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

async function getAuthorizedExhibitor(exhibitorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ej behörig.', status: 401 }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    return { error: 'Ej behörig.', status: 403 }
  }

  const serviceClient = createServiceClient()
  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*, event:events(id, title, organization_id)')
    .eq('id', exhibitorId)
    .single()

  if (!exhibitor) return { error: 'Utställaren hittades inte.', status: 404 }

  const eventOrg = (exhibitor.event as any)?.organization_id
  if (userData.role !== 'superadmin' && eventOrg !== userData.organization_id) {
    return { error: 'Ej behörig.', status: 403 }
  }

  return { exhibitor, serviceClient, userData }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedExhibitor(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { serviceClient } = result
  const body = await request.json()

  const { error } = await serviceClient
    .from('exhibitors')
    .update({
      company_name: body.company_name,
      description: body.description ?? null,
      website: normalizeUrl(body.website),
      email: body.email ?? null,
      phone: body.phone ?? null,
      booth_number: body.booth_number ?? null,
      status: body.status,
      assigned_preset_id: body.assigned_preset_id ?? null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Kunde inte uppdatera utställare.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getAuthorizedExhibitor(id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { serviceClient } = result
  await serviceClient.from('exhibitors').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
