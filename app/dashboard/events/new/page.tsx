import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getImpersonatedOrgId } from '@/lib/impersonation'
import EventForm from '@/components/dashboard/event-form'
import Link from 'next/link'

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['owner', 'admin', 'superadmin'].includes(userData.role)) {
    redirect('/dashboard')
  }

  let organizationId = userData.organization_id
  if (userData.role === 'superadmin') {
    const impersonatedId = await getImpersonatedOrgId()
    if (impersonatedId) organizationId = impersonatedId
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          ← Tillbaka till event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Skapa nytt event</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EventForm organizationId={organizationId} />
      </div>
    </div>
  )
}
