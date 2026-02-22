import { cookies } from 'next/headers'

export async function getImpersonatedOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('impersonated_org_id')?.value ?? null
}
