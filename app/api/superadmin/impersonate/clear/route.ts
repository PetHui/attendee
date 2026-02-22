import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/superadmin', request.url))
  response.cookies.delete('impersonated_org_id')
  return response
}
