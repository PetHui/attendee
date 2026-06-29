import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const service = createServiceClient()

  const { data: event } = await service
    .from('events')
    .select('id, title, organization:organizations(slug)')
    .eq('id', id)
    .single()

  if (!event) return new NextResponse('Not found', { status: 404 })

  const orgSlug = (event.organization as any)?.slug
  if (!orgSlug) return new NextResponse('Not found', { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const registrationUrl = `${appUrl}/${orgSlug}/${id}`

  const qrSvg = await QRCode.toString(registrationUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
  })

  // Wrap in an HTML page so it looks nice and is easy to print/save
  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>QR-kod – ${event.title}</title>
  <style>
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fff; font-family: Arial, sans-serif; }
    .qr { width: min(80vmin, 600px); height: min(80vmin, 600px); }
    .qr svg { width: 100%; height: 100%; }
    p { font-size: 14px; color: #6b7280; margin-top: 16px; word-break: break-all; text-align: center; max-width: 600px; }
    h1 { font-size: 20px; color: #111827; margin: 0 0 8px; text-align: center; }
  </style>
</head>
<body>
  <h1>${event.title}</h1>
  <div class="qr">${qrSvg}</div>
  <p>${registrationUrl}</p>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
