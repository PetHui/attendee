import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QrReveal from '@/components/catalog/qr-reveal'

export default async function ExhibitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventId: string; exhibitorId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { orgSlug, eventId, exhibitorId } = await params
  const { token } = await searchParams

  const serviceClient = createServiceClient()

  const { data: org } = await serviceClient
    .from('organizations')
    .select('id, name, slug, primary_color')
    .eq('slug', orgSlug)
    .single()

  if (!org) notFound()

  const { data: event } = await serviceClient
    .from('events')
    .select('id, title, map_image_url, primary_color')
    .eq('id', eventId)
    .eq('organization_id', org.id)
    .single()

  if (!event) notFound()

  // Validate token
  let isUnlocked = false
  let qrCodeBase64: string | undefined
  let participantName: string | undefined
  if (token) {
    const { data: participant } = await serviceClient
      .from('participants')
      .select('id, participant_field_values(value, registration_fields(label, sort_order))')
      .eq('qr_code', token)
      .eq('event_id', eventId)
      .maybeSingle()
    isUnlocked = !!participant
    if (isUnlocked && participant) {
      const buf = await QRCode.toBuffer(token, { width: 300, margin: 2 })
      qrCodeBase64 = `data:image/png;base64,${buf.toString('base64')}`

      const nameKeywords = ['förnamn', 'efternamn', 'namn', 'name']
      type FieldValue = { value: string; registration_fields: { label: string; sort_order: number } | { label: string; sort_order: number }[] | null }
      const nameValues = (participant.participant_field_values as unknown as FieldValue[])
        .map((fv) => {
          const rf = Array.isArray(fv.registration_fields) ? fv.registration_fields[0] : fv.registration_fields
          return { value: fv.value, rf }
        })
        .filter(({ rf }) => rf && nameKeywords.some((kw) => rf.label.toLowerCase().includes(kw)))
        .sort((a, b) => (a.rf!.sort_order ?? 0) - (b.rf!.sort_order ?? 0))
        .map(({ value }) => value)
        .filter(Boolean)
      participantName = nameValues.length ? nameValues.join(' ') : undefined
    }
  }

  if (!isUnlocked) notFound()

  const { data: exhibitor } = await serviceClient
    .from('exhibitors')
    .select('*, exhibitor_contacts(*), exhibitor_offers(*)')
    .eq('id', exhibitorId)
    .eq('event_id', eventId)
    .eq('status', 'published')
    .single()

  if (!exhibitor) notFound()

  const brand = (event as any).primary_color ?? org.primary_color ?? '#172554'
  const backUrl = `/${orgSlug}/${eventId}/catalog?token=${token}`
  const mapUrl = event?.map_image_url && exhibitor.map_x != null
    ? `/${orgSlug}/${eventId}/catalog?token=${token}&tab=karta&highlight=${exhibitorId}`
    : null
  const offer = (exhibitor.exhibitor_offers as any[])?.[0] ?? null
  const contacts = (exhibitor.exhibitor_contacts as any[]) ?? []

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand': brand } as React.CSSProperties}>
      {/* Header */}
      <div style={{ background: brand }} className="px-4 pt-6 pb-8 text-white">
        <div className="max-w-2xl mx-auto">
          <Link href={backUrl} className="text-white/70 text-sm hover:text-white transition-colors">
            ← Tillbaka till katalogen
          </Link>
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{exhibitor.company_name}</h1>
            {(exhibitor.booth_number || mapUrl) && (
              <div className="flex items-center gap-3 mt-1">
                {exhibitor.booth_number && (
                  <p className="text-white/70 text-sm">Monter {exhibitor.booth_number}</p>
                )}
                {mapUrl && (
                  <Link
                    href={mapUrl}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium px-2.5 py-1 rounded-lg whitespace-nowrap"
                  >
                    <span>🗺️</span>
                    <span>Visa på karta</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          {qrCodeBase64 && token && (
            <QrReveal qrCodeBase64={qrCodeBase64} token={token} participantName={participantName} />
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Erbjudande */}
        {offer && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
              🎁 Mässerbjudande
            </p>
            <p className="font-bold text-amber-900 text-lg">{offer.title}</p>
            {offer.description && (
              <p className="text-amber-800 text-sm mt-2 leading-relaxed">{offer.description}</p>
            )}
          </div>
        )}

        {/* Om företaget */}
        {exhibitor.description && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Om oss</p>
            <p className="text-gray-700 text-sm leading-relaxed">{exhibitor.description}</p>
          </div>
        )}

        {/* Kontaktinfo */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Kontakt</p>
          <div className="space-y-2.5">
            {exhibitor.website && (
              <a
                href={exhibitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-brand hover:opacity-70 transition-opacity"
              >
                <span className="text-lg">🌐</span>
                <span className="truncate">{exhibitor.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {exhibitor.email && (
              <a
                href={`mailto:${exhibitor.email}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900"
              >
                <span className="text-lg">✉️</span>
                <span>{exhibitor.email}</span>
              </a>
            )}
            {exhibitor.phone && (
              <a
                href={`tel:${exhibitor.phone}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900"
              >
                <span className="text-lg">📞</span>
                <span>{exhibitor.phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Kontaktpersoner */}
        {contacts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Kontaktpersoner</p>
            <div className="space-y-3">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                    <div className="flex flex-wrap gap-3 mt-1">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-brand hover:opacity-70">
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="text-xs text-gray-500">
                          {c.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
