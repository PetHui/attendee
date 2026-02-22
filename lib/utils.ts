export function formatSwedishDate(dateStr: string | null, includeTime = true): string {
  if (!dateStr) return '–'
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
  }
  return new Date(dateStr).toLocaleDateString('sv-SE', options)
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  published: 'Publicerat',
  closed: 'Stängt',
  archived: 'Arkiverat',
}

export const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
}

export function generateCSV(
  headers: string[],
  rows: (string | null | undefined)[][]
): string {
  const escape = (val: string | null | undefined) =>
    `"${(val ?? '').replace(/"/g, '""')}"`

  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}
