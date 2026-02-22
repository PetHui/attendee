'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteUserButton({
  orgId,
  userId,
  userName,
}: {
  orgId: string
  userId: string
  userName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Ta bort användaren "${userName}"? Detta går inte att ångra.`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Något gick fel.')
        return
      }

      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
    >
      {loading ? 'Tar bort...' : 'Ta bort'}
    </button>
  )
}
