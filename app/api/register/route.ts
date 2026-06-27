import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendConfirmationEmail, sendConfirmationEmailWithCatalog } from '@/lib/email'

export async function POST(request: Request) {
  const { eventId, fieldValues } = await request.json()
  const supabase = createServiceClient()

  // Verify event is published
  const { data: event } = await supabase
    .from('events')
    .select('*, organization:organizations(name)')
    .eq('id', eventId)
    .eq('status', 'published')
    .single()

  if (!event) {
    return NextResponse.json(
      { error: 'Eventen hittades inte eller är inte öppen för anmälan.' },
      { status: 404 }
    )
  }

  // Check registration deadline
  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    return NextResponse.json({ error: 'Anmälningstiden har gått ut.' }, { status: 409 })
  }

  // Check max participants
  if (event.max_participants) {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if ((count ?? 0) >= event.max_participants) {
      return NextResponse.json({ error: 'Eventen är tyvärr fullbokat.' }, { status: 409 })
    }
  }

  // Create participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({ event_id: eventId })
    .select()
    .single()

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Kunde inte skapa anmälan.' }, { status: 500 })
  }

  // Insert field values
  const fieldValueInserts = Object.entries(fieldValues as Record<string, string>).map(
    ([fieldId, value]) => ({
      participant_id: participant.id,
      field_id: fieldId,
      value,
    })
  )

  if (fieldValueInserts.length > 0) {
    await supabase.from('participant_field_values').insert(fieldValueInserts)
  }

  // Find email + name from field values
  const { data: fields } = await supabase
    .from('registration_fields')
    .select('id, label, field_type, sort_order')
    .eq('event_id', eventId)

  const emailField = fields?.find((f) =>
    ['e-post', 'email', 'mejl', 'epost', 'e post'].some((kw) =>
      f.label.toLowerCase().includes(kw)
    )
  )

  const nameFields = fields
    ?.filter((f) =>
      ['förnamn', 'efternamn', 'namn', 'name'].some((kw) =>
        f.label.toLowerCase().includes(kw)
      )
    )
    .sort((a, b) => a.sort_order - b.sort_order)

  const emailValue = emailField ? (fieldValues as Record<string, string>)[emailField.id] : null
  const participantName =
    nameFields?.length
      ? nameFields
          .map((f) => (fieldValues as Record<string, string>)[f.id] ?? '')
          .filter(Boolean)
          .join(' ')
      : 'Deltagare'

  // Check if event has exhibitors (to include catalog link)
  const { count: exhibitorCount } = await supabase
    .from('exhibitors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'published')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: org } = await supabase
    .from('organizations')
    .select('slug, primary_color')
    .eq('id', event.organization_id)
    .single()

  const catalogUrl =
    (exhibitorCount ?? 0) > 0 && org?.slug
      ? `${appUrl}/${org.slug}/${eventId}/catalog?token=${participant.qr_code}`
      : undefined

  const brandColor = event.primary_color ?? org?.primary_color ?? '#172554'

  // Send confirmation email (non-blocking fail)
  if (emailValue) {
    try {
      const emailCustomTexts = {
        emailIntroText: event.email_intro_text ?? undefined,
        emailQrInstruction: event.email_qr_instruction ?? undefined,
        emailFooterNote: event.email_footer_note ?? undefined,
      }

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
      console.error('[email] Failed to send confirmation:', err)
    }
  }

  return NextResponse.json({ success: true, participantId: participant.id })
}
