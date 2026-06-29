import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendConfirmationEmail, sendConfirmationEmailWithCatalog } from '@/lib/email'
import { getImpersonatedOrgId } from '@/lib/impersonation'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: userData } = await authSupabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!userData) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 403 })

  const effectiveOrgId =
    userData.role === 'superadmin'
      ? await getImpersonatedOrgId()
      : userData.organization_id

  if (!effectiveOrgId) return NextResponse.json({ error: 'Ingen aktiv organisation.' }, { status: 403 })

  const service = createServiceClient()

  const { data: participant } = await service
    .from('participants')
    .select('id, event_id, qr_code')
    .eq('id', id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Deltagare hittades inte.' }, { status: 404 })

  const { data: eventCheck } = await service
    .from('events')
    .select('id')
    .eq('id', participant.event_id)
    .eq('organization_id', effectiveOrgId)
    .single()

  if (!eventCheck) return NextResponse.json({ error: 'Obehörig åtkomst.' }, { status: 403 })

  const [{ data: fieldValues }, { data: event }, { data: fields }] = await Promise.all([
    service.from('participant_field_values').select('field_id, value').eq('participant_id', id),
    service.from('events').select('*').eq('id', participant.event_id).single(),
    service.from('registration_fields').select('id, label, field_type, sort_order').eq('event_id', participant.event_id),
  ])

  if (!event) return NextResponse.json({ error: 'Event hittades inte.' }, { status: 404 })

  const fvMap = Object.fromEntries((fieldValues ?? []).map((fv) => [fv.field_id, fv.value ?? '']))

  const emailField = fields?.find((f) =>
    ['e-post', 'email', 'mejl', 'epost', 'e post'].some((kw) => f.label.toLowerCase().includes(kw))
  )
  const nameFields = fields
    ?.filter((f) => ['förnamn', 'efternamn', 'namn', 'name'].some((kw) => f.label.toLowerCase().includes(kw)))
    .sort((a, b) => a.sort_order - b.sort_order)

  const emailValue = emailField ? fvMap[emailField.id] : null
  if (!emailValue) {
    return NextResponse.json({ error: 'Ingen e-postadress hittades för deltagaren.' }, { status: 400 })
  }

  const participantName = nameFields?.length
    ? nameFields.map((f) => fvMap[f.id] ?? '').filter(Boolean).join(' ')
    : 'Deltagare'

  const [{ data: org }, { count: exhibitorCount }] = await Promise.all([
    service.from('organizations').select('slug, primary_color').eq('id', event.organization_id).single(),
    service.from('exhibitors').select('*', { count: 'exact', head: true }).eq('event_id', participant.event_id).eq('status', 'published'),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const catalogUrl =
    (exhibitorCount ?? 0) > 0 && org?.slug
      ? `${appUrl}/${org.slug}/${participant.event_id}/catalog?token=${participant.qr_code}`
      : undefined

  const brandColor = event.primary_color ?? org?.primary_color ?? '#172554'
  const emailCustomTexts = {
    emailIntroText: event.email_intro_text ?? undefined,
    emailQrInstruction: event.email_qr_instruction ?? undefined,
    emailFooterNote: event.email_footer_note ?? undefined,
  }

  try {
    if (catalogUrl) {
      await sendConfirmationEmailWithCatalog({
        to: emailValue,
        participantName,
        eventTitle: event.title,
        eventDescription: event.description,
        eventLocation: event.location,
        eventStartsAt: event.starts_at,
        eventEndsAt: event.ends_at,
        qrCode: participant.qr_code,
        catalogUrl,
        brandColor,
        ...emailCustomTexts,
      })
    } else {
      await sendConfirmationEmail({
        to: emailValue,
        participantName,
        eventTitle: event.title,
        eventDescription: event.description,
        eventLocation: event.location,
        eventStartsAt: event.starts_at,
        eventEndsAt: event.ends_at,
        qrCode: participant.qr_code,
        brandColor,
        ...emailCustomTexts,
      })
    }
  } catch (err) {
    console.error('[resend-email]', err)
    return NextResponse.json({ error: 'Kunde inte skicka e-post.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, sentTo: emailValue })
}
