'use client'

import { useState } from 'react'

export default function HallkartaLinks({
  publicUrl,
  embedCode,
}: {
  publicUrl: string
  embedCode: string
}) {
  const [copied, setCopied] = useState<'url' | 'embed' | null>(null)
  const [embedOpen, setEmbedOpen] = useState(false)

  function copy(text: string, type: 'url' | 'embed') {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-blue-700 font-medium shrink-0">Publik hallkarta:</span>

      <div className="flex items-center gap-1.5 min-w-0">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline truncate max-w-xs"
        >
          {publicUrl}
        </a>
        <button
          onClick={() => copy(publicUrl, 'url')}
          className="shrink-0 text-xs px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
        >
          {copied === 'url' ? 'Kopierad!' : 'Kopiera'}
        </button>
      </div>

      <button
        onClick={() => setEmbedOpen((v) => !v)}
        className="shrink-0 text-xs px-2 py-0.5 rounded bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 transition-colors"
      >
        {embedOpen ? 'Dölj embed-kod' : 'Visa embed-kod'}
      </button>

      {embedOpen && (
        <div className="w-full mt-1 flex items-start gap-2">
          <code className="flex-1 block bg-white border border-blue-200 rounded p-2 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">
            {embedCode}
          </code>
          <button
            onClick={() => copy(embedCode, 'embed')}
            className="shrink-0 text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
          >
            {copied === 'embed' ? 'Kopierad!' : 'Kopiera'}
          </button>
        </div>
      )}
    </div>
  )
}
