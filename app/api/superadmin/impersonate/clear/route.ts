import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Next.js Link prefetch sends RSC/prefetch headers — ignore those silently
  const isPrefetch =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    request.headers.get('Next-Router-State-Tree') !== null

  if (isPrefetch) {
    return new Response(null, { status: 204 })
  }

  const response = NextResponse.redirect(new URL('/superadmin', request.url))
  response.cookies.delete('impersonated_org_id')
  return response
}
