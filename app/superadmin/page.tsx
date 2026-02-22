import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export default async function SuperadminPage() {
  const supabase = createServiceClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })

  const orgIds = organizations?.map((o) => o.id) ?? []

  // Fetch user counts per org
  const { data: userCounts } = await supabase
    .from('users')
    .select('organization_id')
    .in('organization_id', orgIds)

  // Fetch event counts per org
  const { data: eventCounts } = await supabase
    .from('events')
    .select('organization_id')
    .in('organization_id', orgIds)

  const usersByOrg = (userCounts ?? []).reduce<Record<string, number>>((acc, u) => {
    acc[u.organization_id] = (acc[u.organization_id] ?? 0) + 1
    return acc
  }, {})

  const eventsByOrg = (eventCounts ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.organization_id] = (acc[e.organization_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisationer</h1>
          <p className="text-sm text-gray-500 mt-1">
            {organizations?.length ?? 0} organisationer totalt
          </p>
        </div>
        <Link
          href="/superadmin/organizations/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Skapa organisation
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!organizations?.length ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">Inga organisationer ännu</p>
            <p className="text-sm mt-1">Skapa den första organisationen för att komma igång.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Användare
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skapad
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {org.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-700">{usersByOrg[org.id] ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-700">{eventsByOrg[org.id] ?? 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString('sv-SE')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
