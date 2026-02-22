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

export async function sendConfirmationEmail({
  to,
  participantName,
  eventTitle,
  eventDescription,
  eventLocation,
  eventStartsAt,
  eventEndsAt,
  qrCode,
}: {
  to: string
  participantName: string
  eventTitle: string
  eventDescription: string | null
  eventLocation: string | null
  eventStartsAt: string | null
  eventEndsAt: string | null
  qrCode: string
}) {
  const qrBuffer = await QRCode.toBuffer(qrCode, {
    width: 300,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })

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
            <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Attendee</h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Anmälningsbekräftelse</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hej <strong>${participantName}</strong>!</p>
              <p style="font-size:16px;color:#374151;margin:0 0 28px;">Din anmälan är bekräftad. Vi ser fram emot att träffa dig!</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="color:#4f46e5;font-size:20px;margin:0 0 14px;">${eventTitle}</h2>
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
                    <p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 4px;">Din QR-kod för incheckning</p>
                    <p style="font-size:13px;color:#9ca3af;margin:0 0 16px;">Visa denna kod vid entrén</p>
                    <img src="cid:qrcode" alt="QR-kod" width="200" height="200" style="display:block;margin:0 auto;border-radius:4px;" />
                    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">Spara detta e-postmeddelande eller skärmdumpa QR-koden.</p>
                  </td>
                </tr>
              </table>

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
    subject: `Bekräftelse: ${eventTitle}`,
    html,
    attachments: [
      {
        filename: 'qr-kod.png',
        content: qrBuffer,
        content_id: 'qrcode',
        inline: true,
      },
    ],
  })
}
