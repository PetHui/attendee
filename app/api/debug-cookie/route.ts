import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const impersonated = cookieStore.get('impersonated_org_id')
  return NextResponse.json({
    impersonated_org_id: impersonated?.value ?? null,
    all_cookies: cookieStore.getAll().map((c) => c.name),
  })
}
