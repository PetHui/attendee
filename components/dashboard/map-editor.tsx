'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Exhibitor {
  id: string
  company_name: string
  booth_number: string | null
  map_x: number | null
  map_y: number | null
  map_w: number | null
  map_h: number | null
  map_color: string | null
  assigned_preset_id: string | null
}

interface Preset {
  id: string
  name: string
  width_pct: number
  height_pct: number
  color: string
  sort_order: number
}

interface MapElement {
  id: string
  event_id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  font_size: string
  text_color: string
  bg_color: string | null
  bold: boolean
  border_color: string | null
}

type DragState = {
  kind: 'booth' | 'element'
  id: string
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
}

type Selection =
  | { kind: 'booth'; id: string }
  | { kind: 'element'; id: string }
  | null

const DEFAULT_COLOR = '#bfdbfe'

const FONT_SIZES: { value: string; label: string; cls: string }[] = [
  { value: 'xs', label: 'XS', cls: 'text-[10px]' },
  { value: 'sm', label: 'S', cls: 'text-xs' },
  { value: 'md', label: 'M', cls: 'text-sm' },
  { value: 'lg', label: 'L', cls: 'text-base' },
  { value: 'xl', label: 'XL', cls: 'text-xl' },
]

function fontSizeClass(size: string) {
  return FONT_SIZES.find((f) => f.value === size)?.cls ?? 'text-xs'
}

export default function MapEditor({
  eventId,
  mapImageUrl: initialImageUrl,
  mapAspectRatio: initialAspectRatio,
  exhibitors: initialExhibitors,
  presets: initialPresets,
  initialElements,
}: {
  eventId: string
  mapImageUrl: string | null
  mapAspectRatio: number
  exhibitors: Exhibitor[]
  presets: Preset[]
  initialElements: MapElement[]
}) {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>(initialExhibitors)
  const [presets, setPresets] = useState<Preset[]>(initialPresets)
  const [elements, setElements] = useState<MapElement[]>(initialElements)
  const [mapImageUrl, setMapImageUrl] = useState(initialImageUrl)
  const [mapAspectRatio, setMapAspectRatio] = useState(initialAspectRatio)
  const [selection, setSelection] = useState<Selection>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(presets[0]?.id ?? null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [imageSettingsOpen, setImageSettingsOpen] = useState(!initialImageUrl)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState(initialImageUrl ?? '')
  const [aspectInput, setAspectInput] = useState(String(initialAspectRatio))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPreset, setNewPreset] = useState({ name: '', width_pct: 10, height_pct: 8, color: '#bfdbfe' })
  const [addingPreset, setAddingPreset] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editPreset, setEditPreset] = useState({ name: '', width_pct: 10, height_pct: 8, color: '#bfdbfe' })
  const [newElementLabel, setNewElementLabel] = useState('')
  const [addingElement, setAddingElement] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const placed = exhibitors.filter((e) => e.map_x != null)
  const unplaced = exhibitors.filter((e) => e.map_x == null)
  const filteredUnplaced = selectedPresetId
    ? unplaced.filter((e) => e.assigned_preset_id === selectedPresetId)
    : unplaced
  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? null

  const selectedBooth = selection?.kind === 'booth' ? exhibitors.find((e) => e.id === selection.id) ?? null : null
  const selectedElement = selection?.kind === 'element' ? elements.find((e) => e.id === selection.id) ?? null : null
  const placingNew = selectedBooth && selectedBooth.map_x == null

  // ── Spara position ──────────────────────────────────────────────────────────

  const savePosition = useCallback(async (exhibitor: Exhibitor) => {
    await fetch(`/api/exhibitors/${exhibitor.id}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_x: exhibitor.map_x, map_y: exhibitor.map_y,
        map_w: exhibitor.map_w, map_h: exhibitor.map_h,
        map_color: exhibitor.map_color,
      }),
    })
  }, [])

  const saveElement = useCallback(async (el: MapElement) => {
    await fetch(`/api/events/${eventId}/map-elements/${el.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(el),
    })
  }, [eventId])

  // ── Placera utställare via kartklick ────────────────────────────────────────

  const placeExhibitor = useCallback((exhibitorId: string, x: number, y: number) => {
    const base = exhibitors.find((e) => e.id === exhibitorId)!
    const assignedPreset = base.assigned_preset_id ? presets.find((p) => p.id === base.assigned_preset_id) : null
    const preset = assignedPreset ?? selectedPreset
    const w = preset?.width_pct ?? 10
    const h = preset?.height_pct ?? 8
    setExhibitors((prev) =>
      prev.map((e) =>
        e.id === exhibitorId
          ? { ...e, map_x: Math.max(0, Math.min(100 - w, x)), map_y: Math.max(0, Math.min(100 - h, y)), map_w: w, map_h: h, map_color: e.map_color ?? preset?.color ?? DEFAULT_COLOR }
          : e
      )
    )
    savePosition({ ...base, map_x: Math.max(0, Math.min(100 - w, x)), map_y: Math.max(0, Math.min(100 - h, y)), map_w: w, map_h: h, map_color: base.map_color ?? preset?.color ?? DEFAULT_COLOR })
  }, [selectedPreset, presets, exhibitors, savePosition])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || dragState) return
    if ((e.target as HTMLElement).closest('[data-item]')) return
    if (!placingNew || !selection || selection.kind !== 'booth') return

    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const placingExhibitor = exhibitors.find((e) => e.id === selection.id)
    const assignedPreset = placingExhibitor?.assigned_preset_id ? presets.find((p) => p.id === placingExhibitor.assigned_preset_id) : null
    const activePreset = assignedPreset ?? selectedPreset
    placeExhibitor(selection.id, x - (activePreset?.width_pct ?? 10) / 2, y - (activePreset?.height_pct ?? 8) / 2)
    setSelection(null)
  }, [dragState, placingNew, selection, placeExhibitor, selectedPreset, exhibitors, presets])

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleItemMouseDown = useCallback((e: React.MouseEvent, kind: 'booth' | 'element', id: string) => {
    e.stopPropagation()
    const item = kind === 'booth'
      ? exhibitors.find((ex) => ex.id === id)
      : elements.find((el) => el.id === id)
    if (!item) return

    const x = kind === 'booth' ? (item as Exhibitor).map_x! : (item as MapElement).x
    const y = kind === 'booth' ? (item as Exhibitor).map_y! : (item as MapElement).y

    if (kind === 'booth' && (item as Exhibitor).map_x == null) return

    setDragState({ kind, id, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y })
    setSelection({ kind, id })
  }, [exhibitors, elements])

  useEffect(() => {
    if (!dragState) return

    const onMove = (e: MouseEvent) => {
      if (!mapRef.current) return
      const rect = mapRef.current.getBoundingClientRect()
      const dx = ((e.clientX - dragState.startMouseX) / rect.width) * 100
      const dy = ((e.clientY - dragState.startMouseY) / rect.height) * 100

      if (dragState.kind === 'booth') {
        const ex = exhibitors.find((ex) => ex.id === dragState.id)
        if (!ex) return
        const newX = Math.max(0, Math.min(100 - (ex.map_w ?? 10), dragState.startX + dx))
        const newY = Math.max(0, Math.min(100 - (ex.map_h ?? 8), dragState.startY + dy))
        setExhibitors((prev) => prev.map((e) => e.id === dragState.id ? { ...e, map_x: newX, map_y: newY } : e))
      } else {
        const el = elements.find((el) => el.id === dragState.id)
        if (!el) return
        const newX = Math.max(0, Math.min(100 - el.w, dragState.startX + dx))
        const newY = Math.max(0, Math.min(100 - el.h, dragState.startY + dy))
        setElements((prev) => prev.map((e) => e.id === dragState.id ? { ...e, x: newX, y: newY } : e))
      }
    }

    const onUp = () => {
      if (dragState.kind === 'booth') {
        const updated = exhibitors.find((e) => e.id === dragState.id)
        if (updated && updated.map_x != null) savePosition(updated)
      } else {
        const updated = elements.find((e) => e.id === dragState.id)
        if (updated) saveElement(updated)
      }
      setDragState(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragState, exhibitors, elements, savePosition, saveElement])

  // ── Ta bort från karta ──────────────────────────────────────────────────────

  const removeBoothFromMap = useCallback(async (exhibitorId: string) => {
    setExhibitors((prev) => prev.map((e) => e.id === exhibitorId ? { ...e, map_x: null, map_y: null, map_w: null, map_h: null } : e))
    setSelection(null)
    await fetch(`/api/exhibitors/${exhibitorId}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_x: null, map_y: null, map_w: null, map_h: null, map_color: null }),
    })
  }, [])

  const deleteElement = useCallback(async (elementId: string) => {
    setElements((prev) => prev.filter((e) => e.id !== elementId))
    setSelection(null)
    await fetch(`/api/events/${eventId}/map-elements/${elementId}`, { method: 'DELETE' })
  }, [eventId])

  // ── Ändra monteregenskaper ──────────────────────────────────────────────────

  const changeBoothColor = useCallback(async (exhibitorId: string, color: string) => {
    setExhibitors((prev) => prev.map((e) => e.id === exhibitorId ? { ...e, map_color: color } : e))
    const updated = exhibitors.find((e) => e.id === exhibitorId)
    if (updated) savePosition({ ...updated, map_color: color })
  }, [exhibitors, savePosition])

  const updateElement = useCallback(async (elementId: string, patch: Partial<MapElement>) => {
    let updated: MapElement | undefined
    setElements((prev) => prev.map((e) => {
      if (e.id !== elementId) return e
      updated = { ...e, ...patch }
      return updated
    }))
    if (updated) saveElement(updated)
  }, [saveElement])

  // ── Lägg till textelement ───────────────────────────────────────────────────

  const addElement = async () => {
    if (!newElementLabel.trim()) return
    const res = await fetch(`/api/events/${eventId}/map-elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newElementLabel.trim(), x: 10, y: 10, w: 15, h: 5 }),
    })
    if (res.ok) {
      const created: MapElement = await res.json()
      setElements((prev) => [...prev, created])
      setNewElementLabel('')
      setAddingElement(false)
      setSelection({ kind: 'element', id: created.id })
    }
  }

  // ── Bilduppladdning & inställningar ────────────────────────────────────────

  const saveMapSettings = useCallback(async (url: string, ratio: number) => {
    await fetch(`/api/events/${eventId}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_image_url: url, map_aspect_ratio: ratio }),
    })
  }, [eventId])

  const handleImageSettings = async () => {
    setSaving(true)
    const ratio = parseFloat(aspectInput) || 1.5
    setMapImageUrl(imageUrlInput || null)
    setMapAspectRatio(ratio)
    await saveMapSettings(imageUrlInput, ratio)
    setSaving(false)
    setImageSettingsOpen(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    const supabase = createClient()
    const path = `${eventId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`
    const { data, error } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('event-assets').getPublicUrl(data.path)
      setImageUrlInput(publicUrl)
      const img = new Image()
      img.onload = () => setAspectInput((img.width / img.height).toFixed(2))
      img.src = publicUrl
    }
    setUploading(false)
  }

  // ── Presets ─────────────────────────────────────────────────────────────────

  const addPreset = async () => {
    const res = await fetch(`/api/events/${eventId}/booth-presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPreset, sort_order: presets.length }),
    })
    if (res.ok) {
      const created = await res.json()
      setPresets((prev) => [...prev, created])
      if (!selectedPresetId) setSelectedPresetId(created.id)
      setNewPreset({ name: '', width_pct: 10, height_pct: 8, color: '#bfdbfe' })
      setAddingPreset(false)
    }
  }

  const deletePreset = async (presetId: string) => {
    await fetch(`/api/events/${eventId}/booth-presets/${presetId}`, { method: 'DELETE' })
    setPresets((prev) => prev.filter((p) => p.id !== presetId))
    if (selectedPresetId === presetId) setSelectedPresetId(presets.find((p) => p.id !== presetId)?.id ?? null)
  }

  const startEditPreset = (p: Preset) => {
    setEditingPresetId(p.id)
    setEditPreset({ name: p.name, width_pct: p.width_pct, height_pct: p.height_pct, color: p.color })
  }

  const saveEditPreset = async (presetId: string) => {
    await fetch(`/api/events/${eventId}/booth-presets/${presetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPreset),
    })
    setPresets((prev) => prev.map((p) => p.id === presetId ? { ...p, ...editPreset } : p))
    setEditingPresetId(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* Vänster sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">

        {/* Hallplansbild */}
        <div className="border-b border-gray-200">
          <button onClick={() => setImageSettingsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <span>Hallplansbild</span>
            <span className="text-gray-400">{imageSettingsOpen ? '▲' : '▼'}</span>
          </button>
          {imageSettingsOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ladda upp bild</label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full text-xs border border-gray-300 rounded px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-50">
                  {uploading ? 'Laddar upp…' : 'Välj fil…'}
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Eller bildadress (URL)</label>
                <input type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="https://…" className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bildförhållande (bredd/höjd)</label>
                <input type="number" step="0.01" value={aspectInput} onChange={(e) => setAspectInput(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <button onClick={handleImageSettings} disabled={saving} className="w-full text-xs bg-brand text-white rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
                {saving ? 'Sparar…' : 'Spara inställningar'}
              </button>
            </div>
          )}
        </div>

        {/* Monterstorlekar */}
        <div className="border-b border-gray-200">
          <button onClick={() => setPresetsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <span>Monterstorlekar</span>
            <span className="text-gray-400">{presetsOpen ? '▲' : '▼'}</span>
          </button>
          {presetsOpen && (
            <div className="px-4 pb-4 space-y-2">
              {presets.map((p) => (
                <div key={p.id} className="text-xs">
                  {editingPresetId === p.id ? (
                    <div className="space-y-1.5 border border-brand/30 rounded p-2 bg-brand/5">
                      <input
                        type="text"
                        value={editPreset.name}
                        onChange={(e) => setEditPreset((v) => ({ ...v, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-2 py-1"
                        placeholder="Namn"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-gray-400 mb-0.5">Bredd %</label>
                          <input type="number" value={editPreset.width_pct} onChange={(e) => setEditPreset((v) => ({ ...v, width_pct: parseFloat(e.target.value) || 1 }))} className="w-full border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-400 mb-0.5">Höjd %</label>
                          <input type="number" value={editPreset.height_pct} onChange={(e) => setEditPreset((v) => ({ ...v, height_pct: parseFloat(e.target.value) || 1 }))} className="w-full border border-gray-300 rounded px-2 py-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-gray-500">Färg</label>
                        <input type="color" value={editPreset.color} onChange={(e) => setEditPreset((v) => ({ ...v, color: e.target.value }))} className="h-6 w-10 rounded border border-gray-300 cursor-pointer" />
                      </div>
                      <div className="flex gap-2 pt-0.5">
                        <button onClick={() => saveEditPreset(p.id)} disabled={!editPreset.name} className="flex-1 bg-brand text-white rounded px-2 py-1 disabled:opacity-50">Spara</button>
                        <button onClick={() => setEditingPresetId(null)} className="flex-1 border border-gray-300 rounded px-2 py-1">Avbryt</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded flex-shrink-0 border border-gray-300" style={{ backgroundColor: p.color }} />
                      <span className="flex-1 truncate">{p.name} ({p.width_pct}×{p.height_pct}%)</span>
                      <button onClick={() => startEditPreset(p)} className="text-gray-400 hover:text-brand">✎</button>
                      <button onClick={() => deletePreset(p.id)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  )}
                </div>
              ))}
              {addingPreset ? (
                <div className="space-y-2 pt-1">
                  <input type="text" placeholder="Namn (t.ex. Liten)" value={newPreset.name} onChange={(e) => setNewPreset((v) => ({ ...v, name: e.target.value }))} className="w-full text-xs border border-gray-300 rounded px-2 py-1" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-0.5">Bredd %</label>
                      <input type="number" value={newPreset.width_pct} onChange={(e) => setNewPreset((v) => ({ ...v, width_pct: parseFloat(e.target.value) || 10 }))} className="w-full text-xs border border-gray-300 rounded px-2 py-1" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-0.5">Höjd %</label>
                      <input type="number" value={newPreset.height_pct} onChange={(e) => setNewPreset((v) => ({ ...v, height_pct: parseFloat(e.target.value) || 8 }))} className="w-full text-xs border border-gray-300 rounded px-2 py-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Färg</label>
                    <input type="color" value={newPreset.color} onChange={(e) => setNewPreset((v) => ({ ...v, color: e.target.value }))} className="h-6 w-10 rounded border border-gray-300 cursor-pointer" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addPreset} disabled={!newPreset.name} className="flex-1 text-xs bg-brand text-white rounded px-2 py-1 disabled:opacity-50">Lägg till</button>
                    <button onClick={() => setAddingPreset(false)} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">Avbryt</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingPreset(true)} className="w-full text-xs text-brand hover:opacity-70 text-left pt-1">+ Ny storlek</button>
              )}
            </div>
          )}
        </div>

        {/* Filtrera / placera med montertyp */}
        {presets.length > 0 && (
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-2">Filtrera ej utplacerade:</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedPresetId(null)}
                className={`text-xs px-2 py-1 rounded border transition-all ${!selectedPresetId ? 'border-brand text-brand font-medium' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
              >
                Alla ({unplaced.length})
              </button>
              {presets.map((p) => {
                const count = unplaced.filter((e) => e.assigned_preset_id === p.id).length
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPresetId(selectedPresetId === p.id ? null : p.id)}
                    className={`text-xs px-2 py-1 rounded border transition-all ${selectedPresetId === p.id ? 'border-brand text-brand font-medium' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                  >
                    {p.name} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Ej placerade utställare + element-lista */}
        <div className="flex-1 overflow-y-auto">
          {unplaced.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Ej utplacerade ({selectedPresetId && filteredUnplaced.length !== unplaced.length ? `${filteredUnplaced.length} av ${unplaced.length}` : unplaced.length})
              </p>
              <div className="space-y-1">
                {filteredUnplaced.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Inga utställare med denna montertyp.</p>
                )}
                {filteredUnplaced.map((e) => (
                  <button key={e.id} onClick={() => setSelection(selection?.kind === 'booth' && selection.id === e.id ? null : { kind: 'booth', id: e.id })}
                    className={`w-full text-left text-xs px-3 py-2 rounded border transition-all ${selection?.kind === 'booth' && selection.id === e.id ? 'border-brand bg-brand/5 text-brand font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <span className="block font-medium truncate">{e.company_name}</span>
                    <span className="text-gray-400">
                      {e.booth_number && `Monter ${e.booth_number}`}
                      {e.booth_number && e.assigned_preset_id && ' · '}
                      {e.assigned_preset_id && (presets.find((p) => p.id === e.assigned_preset_id)?.name ?? '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {placed.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Utplacerade ({placed.length})</p>
              <div className="space-y-1">
                {placed.map((e) => (
                  <div key={e.id} className={`text-xs px-3 py-2 rounded border flex items-center gap-2 ${selection?.kind === 'booth' && selection.id === e.id ? 'border-brand bg-brand/5' : 'border-gray-100 bg-white'}`}>
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: e.map_color ?? DEFAULT_COLOR }} />
                    <span className="flex-1 truncate text-gray-700">{e.company_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Textelement */}
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Textelement ({elements.length})</p>
            <div className="space-y-1 mb-2">
              {elements.map((el) => (
                <button key={el.id} onClick={() => setSelection(selection?.kind === 'element' && selection.id === el.id ? null : { kind: 'element', id: el.id })}
                  className={`w-full text-left text-xs px-3 py-2 rounded border transition-all ${selection?.kind === 'element' && selection.id === el.id ? 'border-brand bg-brand/5 text-brand font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                  {el.label}
                </button>
              ))}
            </div>
            {addingElement ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Text (t.ex. SCEN, ENTRÉ)"
                  value={newElementLabel}
                  onChange={(e) => setNewElementLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addElement()}
                  autoFocus
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                <div className="flex gap-2">
                  <button onClick={addElement} disabled={!newElementLabel.trim()} className="flex-1 text-xs bg-brand text-white rounded px-2 py-1 disabled:opacity-50">Lägg till</button>
                  <button onClick={() => { setAddingElement(false); setNewElementLabel('') }} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">Avbryt</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingElement(true)} className="w-full text-xs text-brand hover:opacity-70 text-left">+ Nytt textelement</button>
            )}
          </div>
        </div>
      </div>

      {/* Kartvy */}
      <div className="flex-1 overflow-auto bg-gray-100 flex flex-col">
        {placingNew && (
          <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 text-sm text-brand text-center">
            Klicka på kartan för att placera <strong>{selectedBooth!.company_name}</strong>
          </div>
        )}

        {!mapImageUrl ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-sm font-medium">Ingen hallplansbild inlagd</p>
              <p className="text-xs mt-1">Öppna "Hallplansbild" i sidomenyn och ladda upp en bild</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 flex items-start justify-center overflow-auto">
            <div
              className="relative bg-white shadow-lg select-none"
              style={{ width: '100%', maxWidth: '1000px', aspectRatio: String(mapAspectRatio), cursor: placingNew ? 'crosshair' : 'default' }}
              ref={mapRef}
              onClick={handleMapClick}
            >
              <img src={mapImageUrl} alt="Hallkarta" className="absolute inset-0 w-full h-full object-cover rounded" draggable={false} />

              {/* Utställarmontrar */}
              {placed.map((e) => {
                const isSelected = selection?.kind === 'booth' && selection.id === e.id
                return (
                  <div
                    key={e.id}
                    data-item
                    onMouseDown={(ev) => handleItemMouseDown(ev, 'booth', e.id)}
                    onClick={(ev) => { ev.stopPropagation(); setSelection(isSelected ? null : { kind: 'booth', id: e.id }) }}
                    className="absolute rounded border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
                    style={{
                      left: `${e.map_x}%`, top: `${e.map_y}%`,
                      width: `${e.map_w}%`, height: `${e.map_h}%`,
                      backgroundColor: e.map_color ?? DEFAULT_COLOR,
                      borderColor: isSelected ? '#1d4ed8' : 'rgba(0,0,0,0.15)',
                      zIndex: isSelected ? 20 : 1,
                      boxShadow: isSelected ? '0 0 0 2px #1d4ed8' : undefined,
                    }}
                  >
                    <span className="text-xs font-semibold text-gray-800 text-center px-1 leading-tight truncate w-full text-center">{e.company_name}</span>
                    {e.booth_number && <span className="text-[10px] text-gray-600">{e.booth_number}</span>}
                  </div>
                )
              })}

              {/* Textelement */}
              {elements.map((el) => {
                const isSelected = selection?.kind === 'element' && selection.id === el.id
                return (
                  <div
                    key={el.id}
                    data-item
                    onMouseDown={(ev) => handleItemMouseDown(ev, 'element', el.id)}
                    onClick={(ev) => { ev.stopPropagation(); setSelection(isSelected ? null : { kind: 'element', id: el.id }) }}
                    className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing rounded overflow-hidden p-1"
                    style={{
                      left: `${el.x}%`, top: `${el.y}%`,
                      width: `${el.w}%`, height: `${el.h}%`,
                      backgroundColor: el.bg_color ?? 'transparent',
                      border: isSelected
                        ? '2px dashed #1d4ed8'
                        : el.border_color
                          ? `1px solid ${el.border_color}`
                          : '1px solid transparent',
                      zIndex: isSelected ? 20 : 2,
                    }}
                  >
                    <span
                      className={`${fontSizeClass(el.font_size)} ${el.bold ? 'font-bold' : 'font-medium'} text-center leading-tight`}
                      style={{ color: el.text_color }}
                    >
                      {el.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Höger panel: vald monter */}
      {selectedBooth && selectedBooth.map_x != null && (
        <div className="w-52 border-l border-gray-200 bg-white p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate">{selectedBooth.company_name}</p>
            {selectedBooth.booth_number && <p className="text-xs text-gray-500">Monter {selectedBooth.booth_number}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Färg</label>
            <input type="color" value={selectedBooth.map_color ?? DEFAULT_COLOR} onChange={(e) => changeBoothColor(selectedBooth.id, e.target.value)} className="h-8 w-full rounded border border-gray-300 cursor-pointer" />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Position: {selectedBooth.map_x?.toFixed(1)}%, {selectedBooth.map_y?.toFixed(1)}%</p>
            <p>Storlek: {selectedBooth.map_w?.toFixed(1)}% × {selectedBooth.map_h?.toFixed(1)}%</p>
          </div>
          {presets.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ändra storlek</label>
              <div className="space-y-1">
                {presets.map((p) => (
                  <button key={p.id}
                    onClick={async () => {
                      const updated = { ...selectedBooth, map_w: p.width_pct, map_h: p.height_pct, assigned_preset_id: p.id }
                      setExhibitors((prev) => prev.map((e) => e.id === selectedBooth.id ? updated : e))
                      await fetch(`/api/exhibitors/${selectedBooth.id}/map`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          map_x: updated.map_x, map_y: updated.map_y,
                          map_w: updated.map_w, map_h: updated.map_h,
                          map_color: updated.map_color,
                          assigned_preset_id: p.id,
                        }),
                      })
                    }}
                    className="w-full text-xs text-left px-2 py-1.5 rounded border border-gray-200 hover:border-brand hover:text-brand"
                  >
                    {p.name} ({p.width_pct}×{p.height_pct}%)
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => removeBoothFromMap(selectedBooth.id)} className="w-full text-xs text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50">
            Ta bort från karta
          </button>
        </div>
      )}

      {/* Höger panel: valt textelement */}
      {selectedElement && (
        <div className="w-52 border-l border-gray-200 bg-white p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Textelement</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Text</label>
            <input
              type="text"
              value={selectedElement.label}
              onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Textstorlek</label>
            <div className="flex gap-1">
              {FONT_SIZES.map((f) => (
                <button key={f.value} onClick={() => updateElement(selectedElement.id, { font_size: f.value })}
                  className={`flex-1 text-xs py-1 rounded border ${selectedElement.font_size === f.value ? 'border-brand text-brand font-medium' : 'border-gray-200 text-gray-600'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Fet</label>
            <button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })}
              className={`text-xs px-3 py-1 rounded border ${selectedElement.bold ? 'border-brand bg-brand/5 text-brand' : 'border-gray-300 text-gray-600'}`}>
              {selectedElement.bold ? 'På' : 'Av'}
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Textfärg</label>
            <input type="color" value={selectedElement.text_color} onChange={(e) => updateElement(selectedElement.id, { text_color: e.target.value })} className="h-8 w-full rounded border border-gray-300 cursor-pointer" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Bakgrundsfärg</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={selectedElement.bg_color ?? '#ffffff'} onChange={(e) => updateElement(selectedElement.id, { bg_color: e.target.value })} className="h-8 flex-1 rounded border border-gray-300 cursor-pointer" />
              {selectedElement.bg_color && (
                <button onClick={() => updateElement(selectedElement.id, { bg_color: null })} className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap">
                  Ingen
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Ram</label>
            {selectedElement.border_color ? (
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selectedElement.border_color}
                  onChange={(e) => updateElement(selectedElement.id, { border_color: e.target.value })}
                  className="h-8 flex-1 rounded border border-gray-300 cursor-pointer"
                />
                <button
                  onClick={() => updateElement(selectedElement.id, { border_color: null })}
                  className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                >
                  Ta bort
                </button>
              </div>
            ) : (
              <button
                onClick={() => updateElement(selectedElement.id, { border_color: '#374151' })}
                className="w-full text-xs border border-gray-300 rounded px-3 py-1.5 hover:border-brand hover:text-brand"
              >
                + Lägg till ram
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Storlek (%)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-0.5">Bredd</label>
                <input
                  type="number"
                  min={2} max={100} step={0.5}
                  value={parseFloat(selectedElement.w.toFixed(1))}
                  onChange={(e) => updateElement(selectedElement.id, { w: parseFloat(e.target.value) || selectedElement.w })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-0.5">Höjd</label>
                <input
                  type="number"
                  min={1} max={100} step={0.5}
                  value={parseFloat(selectedElement.h.toFixed(1))}
                  onChange={(e) => updateElement(selectedElement.id, { h: parseFloat(e.target.value) || selectedElement.h })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
            </div>
          </div>

          <button onClick={() => deleteElement(selectedElement.id)} className="w-full text-xs text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50">
            Ta bort element
          </button>
        </div>
      )}
    </div>
  )
}
