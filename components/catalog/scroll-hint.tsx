'use client'

import { useEffect, useState } from 'react'

export default function ScrollHint({ brand }: { brand?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function update() {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 10
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40
      setVisible(scrollable && !nearBottom)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' })}
      style={{ color: brand ?? undefined }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 text-gray-400 hover:opacity-80 transition-opacity"
      aria-label="Scrolla ner"
    >
      <span className="text-xs font-medium">Mer att se</span>
      <svg
        className="w-6 h-6 animate-bounce"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}
