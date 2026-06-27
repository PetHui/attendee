'use client'

import { useTransition } from 'react'
import { impersonateOrg } from './actions'

export default function ImpersonateButton({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => impersonateOrg(orgId))}
      disabled={pending}
      className="text-sm font-medium text-blue-950 hover:text-blue-900 transition-colors disabled:opacity-50"
    >
      {pending ? 'Laddar...' : 'Hantera →'}
    </button>
  )
}
