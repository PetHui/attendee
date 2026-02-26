import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import DashboardShell from '@/components/dashboard/dashboard-shell'
import ImpersonationBanner from '@/components/dashboard/impersonation-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  const impersonatedOrgId =
    userData?.role === 'superadmin' ? await getImpersonatedOrgId() : null

  // Superadmin utan impersonering skickas tillbaka till superadmin-panelen
  if (userData?.role === 'superadmin' && !impersonatedOrgId) {
    redirect('/superadmin')
  }

  // Läs in den impersonerade organisationens data och sätt på userData
  let effectiveUserData = userData
  if (impersonatedOrgId) {
    const serviceSupabase = createServiceClient()
    const { data: impOrg } = await serviceSupabase
      .from('organizations')
      .select('*')
      .eq('id', impersonatedOrgId)
      .single()

    if (impOrg) {
      effectiveUserData = {
        ...userData,
        organization_id: impersonatedOrgId,
        organization: impOrg,
      }
    }
  }

  const brand = effectiveUserData?.organization?.primary_color ?? '#6366f1'

  return (
    <DashboardShell
      user={effectiveUserData}
      brand={brand}
      impersonationBanner={impersonatedOrgId ? <ImpersonationBanner orgId={impersonatedOrgId} /> : null}
    >
      {children}
    </DashboardShell>
  )
}
