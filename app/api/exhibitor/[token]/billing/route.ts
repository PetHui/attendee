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
  const payload = {
    exhibitor_id: exhibitor.id,
    company_name: body.company_name || null,
    org_number: body.org_number || null,
    vat_number: body.vat_number || null,
    billing_address: body.billing_address || null,
    billing_email: body.billing_email || null,
    billing_reference: body.billing_reference || null,
  }

  const { data: existing } = await serviceClient
    .from('exhibitor_billing')
    .select('id')
    .eq('exhibitor_id', exhibitor.id)
    .maybeSingle()

  if (existing) {
    await serviceClient.from('exhibitor_billing').update(payload).eq('exhibitor_id', exhibitor.id)
  } else {
    await serviceClient.from('exhibitor_billing').insert(payload)
  }

  return NextResponse.json({ success: true })
}
