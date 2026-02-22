import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export default async function ImpersonationBanner({ orgId }: { orgId: string }) {
  const supabase = createServiceClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between shrink-0">
      <p className="text-sm text-amber-800">
        <span className="font-medium">Superadmin</span> — du hanterar{' '}
        <span className="font-semibold">{org?.name}</span>
      </p>
      <Link
        href="/api/superadmin/impersonate/clear"
        className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
      >
        Avsluta
      </Link>
    </div>
  )
}
