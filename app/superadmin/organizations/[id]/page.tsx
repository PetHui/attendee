import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  owner: 'Ägare',
  admin: 'Admin',
  staff: 'Personal',
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('id', id)
    .single()

  if (!org) notFound()

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/superadmin"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Tillbaka
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{org.name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{org.slug}</code>
          <span className="text-sm text-gray-400">
            Skapad {new Date(org.created_at).toLocaleDateString('sv-SE')}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Användare</h2>
          <span className="text-sm text-gray-500">{users?.length ?? 0} st</span>
        </div>

        {!users?.length ? (
          <div className="p-8 text-center text-gray-500 text-sm">Inga användare hittades.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Namn
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-post
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tillagd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('sv-SE')}
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
