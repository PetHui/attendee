import { Resend } from 'resend'
import QRCode from 'qrcode'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatSwedishDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DEFAULT_INTRO_TEXT = 'Din anmälan är bekräftad. Vi ser fram emot att träffa dig!'
const DEFAULT_QR_INSTRUCTION = 'Visa denna kod vid entrén'
const DEFAULT_FOOTER_NOTE = 'Har du frågor? Kontakta arrangören direkt.'

export async function sendConfirmationEmail({
  to,
  participantName,
  eventTitle,
  eventDescription,
  eventLocation,
  eventStartsAt,
  eventEndsAt,
  qrCode,
  brandColor = '#172554',
  emailIntroText,
  emailQrInstruction,
  emailFooterNote,
}: {
  to: string
  participantName: string
  eventTitle: string
  eventDescription: string | null
  eventLocation: string | null
  eventStartsAt: string | null
  eventEndsAt: string | null
  qrCode: string
  brandColor?: string
  emailIntroText?: string | null
  emailQrInstruction?: string | null
  emailFooterNote?: string | null
}) {
  const qrBuffer = await QRCode.toBuffer(qrCode, {
    width: 300,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })
  const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`

  const introText = emailIntroText ?? DEFAULT_INTRO_TEXT
  const qrInstruction = emailQrInstruction ?? DEFAULT_QR_INSTRUCTION
  const footerNote = emailFooterNote ?? DEFAULT_FOOTER_NOTE

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anmälningsbekräftelse</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${brandColor};border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Attendee</h1>
              <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px;">Anmälningsbekräftelse</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hej <strong>${participantName}</strong>!</p>
              <p style="font-size:16px;color:#374151;margin:0 0 28px;">${introText}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="color:${brandColor};font-size:20px;margin:0 0 14px;">${eventTitle}</h2>
                    ${eventDescription ? `<p style="color:#6b7280;font-size:14px;margin:0 0 14px;line-height:1.6;">${eventDescription}</p>` : ''}
                    ${eventLocation ? `<p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Plats:</strong> ${eventLocation}</p>` : ''}
                    ${eventStartsAt ? `<p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Startar:</strong> ${formatSwedishDate(eventStartsAt)}</p>` : ''}
                    ${eventEndsAt ? `<p style="font-size:14px;color:#374151;margin:0;"><strong>Slutar:</strong> ${formatSwedishDate(eventEndsAt)}</p>` : ''}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px;background:#f9fafb;border:2px dashed #d1d5db;border-radius:8px;text-align:center;">
                    <p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 4px;">${participantName}</p>
                    <p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 4px;">Din personliga QR-kod</p>
                    <p style="font-size:13px;color:#9ca3af;margin:0 0 16px;">${qrInstruction}</p>
                    <img src="${qrBase64}" alt="QR-kod" width="200" height="200" style="display:block;margin:0 auto;border-radius:4px;" />
                    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">Spara detta e-postmeddelande eller skärmdumpa QR-koden.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#9ca3af;text-align:center;margin:24px 0 0;">
                ${footerNote}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:14px;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">Powered by <strong style="color:#4f46e5;">Attendee</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Attendee <noreply@attendee.se>',
    to,
    subject: `Bekräftelse: ${eventTitle}`,
    html,
  })
}

export async function sendConfirmationEmailWithCatalog({
  catalogUrl,
  ...rest
}: Parameters<typeof sendConfirmationEmail>[0] & { catalogUrl?: string }) {
  const qrBuffer = await QRCode.toBuffer(rest.qrCode, {
    width: 300,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })
  const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`

  const introText = rest.emailIntroText ?? DEFAULT_INTRO_TEXT
  const qrInstruction = rest.emailQrInstruction ?? DEFAULT_QR_INSTRUCTION
  const footerNote = rest.emailFooterNote ?? DEFAULT_FOOTER_NOTE

  const catalogSection = catalogUrl
    ? `<tr>
        <td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 4px;">🎁 Utställarkatalog med erbjudanden</p>
                <p style="font-size:13px;color:#92400e;margin:0 0 12px;">Din personliga länk till mässans utställare och specialerbjudanden:</p>
                <a href="${catalogUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
                  Öppna utställarkatalogen →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anmälningsbekräftelse</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${rest.brandColor ?? '#172554'};border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Attendee</h1>
              <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px;">Anmälningsbekräftelse</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hej <strong>${rest.participantName}</strong>!</p>
              <p style="font-size:16px;color:#374151;margin:0 0 28px;">${introText}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="color:${rest.brandColor ?? '#172554'};font-size:20px;margin:0 0 14px;">${rest.eventTitle}</h2>
                    ${rest.eventDescription ? `<p style="color:#6b7280;font-size:14px;margin:0 0 14px;line-height:1.6;">${rest.eventDescription}</p>` : ''}
                    ${rest.eventLocation ? `<p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Plats:</strong> ${rest.eventLocation}</p>` : ''}
                    ${rest.eventStartsAt ? `<p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Startar:</strong> ${formatSwedishDate(rest.eventStartsAt)}</p>` : ''}
                    ${rest.eventEndsAt ? `<p style="font-size:14px;color:#374151;margin:0;"><strong>Slutar:</strong> ${formatSwedishDate(rest.eventEndsAt)}</p>` : ''}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px;background:#f9fafb;border:2px dashed #d1d5db;border-radius:8px;text-align:center;">
                    <p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 4px;">${rest.participantName}</p>
                    <p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 4px;">Din personliga QR-kod</p>
                    <p style="font-size:13px;color:#9ca3af;margin:0 0 16px;">${qrInstruction}</p>
                    <img src="${qrBase64}" alt="QR-kod" width="200" height="200" style="display:block;margin:0 auto;border-radius:4px;" />
                    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">Spara detta e-postmeddelande eller skärmdumpa QR-koden.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#9ca3af;text-align:center;margin:24px 0 0;">
                ${footerNote}
              </p>
            </td>
          </tr>
          ${catalogSection}
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:14px;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">Powered by <strong style="color:#4f46e5;">Attendee</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Attendee <noreply@attendee.se>',
    to: rest.to,
    subject: `Bekräftelse: ${rest.eventTitle}`,
    html,
  })
}

export async function sendExhibitorInviteEmail({
  to,
  companyName,
  eventTitle,
  editToken,
  appUrl,
}: {
  to: string
  companyName: string
  eventTitle: string
  editToken: string
  appUrl: string
}) {
  const portalUrl = `${appUrl}/exhibitor/${editToken}`

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Utställarinbjudan</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Attendee</h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Utställarportal</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hej <strong>${companyName}</strong>!</p>
              <p style="font-size:16px;color:#374151;margin:0 0 20px;">
                Ni är registrerade som utställare på <strong>${eventTitle}</strong>.
                Fyll i era uppgifter och lägg till eventuella erbjudanden till mässans besökare.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="text-align:center;padding:24px;background:#f0f0ff;border-radius:8px;">
                    <p style="font-size:14px;color:#4338ca;font-weight:600;margin:0 0 16px;">Er personliga redigeringslänk:</p>
                    <a href="${portalUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">
                      Öppna utställarportalen →
                    </a>
                    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">
                      Länken är personlig för er organisation. Dela den inte offentligt.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#6b7280;margin:0;">
                Via portalen kan ni fylla i företagsbeskrivning, kontaktpersoner, faktureringsuppgifter och lägga till ett erbjudande som visas i mässans utställarkatalog.
              </p>

              <p style="font-size:12px;color:#9ca3af;text-align:center;margin:24px 0 0;">
                Har du frågor? Kontakta arrangören direkt.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:14px;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">Powered by <strong style="color:#4f46e5;">Attendee</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Attendee <noreply@attendee.se>',
    to,
    subject: `Utställarinbjudan: ${eventTitle}`,
    html,
  })
}
