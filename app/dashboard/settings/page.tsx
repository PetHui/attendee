import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const isSuperadmin = userData?.role === 'superadmin'
  const impersonatedOrgId = isSuperadmin ? await getImpersonatedOrgId() : null
  const orgId = impersonatedOrgId ?? userData?.organization_id

  if (!orgId) redirect('/dashboard')

  const dataClient = isSuperadmin ? createServiceClient() : supabase
  const { data: org } = await dataClient
    .from('organizations')
    .select('primary_color')
    .eq('id', orgId)
    .single()

  return (
    <SettingsForm
      orgId={orgId}
      initialColor={org?.primary_color ?? '#6366f1'}
    />
  )
}
