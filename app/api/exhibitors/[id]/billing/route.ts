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
    .from('exhibitor_billing')
    .select('id')
    .eq('exhibitor_id', id)
    .maybeSingle()

  const payload = {
    exhibitor_id: id,
    company_name: body.company_name || null,
    org_number: body.org_number || null,
    vat_number: body.vat_number || null,
    billing_address: body.billing_address || null,
    billing_email: body.billing_email || null,
    billing_reference: body.billing_reference || null,
  }

  if (existing) {
    await serviceClient.from('exhibitor_billing').update(payload).eq('exhibitor_id', id)
  } else {
    await serviceClient.from('exhibitor_billing').insert(payload)
  }

  return NextResponse.json({ success: true })
}
