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
}

interface Preset {
  id: string
  name: string
  width_pct: number
  height_pct: number
  color: string
  sort_order: number
}

interface DragState {
  exhibitorId: string
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
}

const DEFAULT_COLOR = '#bfdbfe'

export default function MapEditor({
  eventId,
  mapImageUrl: initialImageUrl,
  mapAspectRatio: initialAspectRatio,
  exhibitors: initialExhibitors,
  presets: initialPresets,
}: {
  eventId: string
  mapImageUrl: string | null
  mapAspectRatio: number
  exhibitors: Exhibitor[]
  presets: Preset[]
}) {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>(initialExhibitors)
  const [presets, setPresets] = useState<Preset[]>(initialPresets)
  const [mapImageUrl, setMapImageUrl] = useState(initialImageUrl)
  const [mapAspectRatio, setMapAspectRatio] = useState(initialAspectRatio)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const mapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const placed = exhibitors.filter((e) => e.map_x != null)
  const unplaced = exhibitors.filter((e) => e.map_x == null)
  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? null

  const saveMapSettings = useCallback(async (url: string, ratio: number) => {
    await fetch(`/api/events/${eventId}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_image_url: url, map_aspect_ratio: ratio }),
    })
  }, [eventId])

  const savePosition = useCallback(async (exhibitor: Exhibitor) => {
    await fetch(`/api/exhibitors/${exhibitor.id}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_x: exhibitor.map_x,
        map_y: exhibitor.map_y,
        map_w: exhibitor.map_w,
        map_h: exhibitor.map_h,
        map_color: exhibitor.map_color,
      }),
    })
  }, [])

  const placeExhibitor = useCallback((exhibitorId: string, x: number, y: number) => {
    const preset = selectedPreset
    setExhibitors((prev) =>
      prev.map((e) =>
        e.id === exhibitorId
          ? {
              ...e,
              map_x: Math.max(0, Math.min(100 - (preset?.width_pct ?? 10), x)),
              map_y: Math.max(0, Math.min(100 - (preset?.height_pct ?? 8), y)),
              map_w: preset?.width_pct ?? 10,
              map_h: preset?.height_pct ?? 8,
              map_color: e.map_color ?? preset?.color ?? DEFAULT_COLOR,
            }
          : e
      )
    )
    const updated = exhibitors.find((e) => e.id === exhibitorId)
    if (updated) {
      const w = preset?.width_pct ?? 10
      const h = preset?.height_pct ?? 8
      savePosition({
        ...updated,
        map_x: Math.max(0, Math.min(100 - w, x)),
        map_y: Math.max(0, Math.min(100 - h, y)),
        map_w: w,
        map_h: h,
        map_color: updated.map_color ?? preset?.color ?? DEFAULT_COLOR,
      })
    }
  }, [selectedPreset, exhibitors, savePosition])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || dragState) return
    const pendingId = (e.target as HTMLElement).closest('[data-booth]') ? null : selectedId
    if (!pendingId) return
    const exhibitor = exhibitors.find((ex) => ex.id === pendingId)
    if (!exhibitor || exhibitor.map_x != null) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    placeExhibitor(pendingId, x - (selectedPreset?.width_pct ?? 10) / 2, y - (selectedPreset?.height_pct ?? 8) / 2)
    setSelectedId(null)
  }, [dragState, selectedId, exhibitors, placeExhibitor, selectedPreset])

  const handleBoothMouseDown = useCallback((e: React.MouseEvent, exhibitorId: string) => {
    e.stopPropagation()
    const exhibitor = exhibitors.find((ex) => ex.id === exhibitorId)
    if (!exhibitor || exhibitor.map_x == null) return

    setDragState({
      exhibitorId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: exhibitor.map_x,
      startY: exhibitor.map_y!,
    })
    setSelectedId(exhibitorId)
  }, [exhibitors])

  useEffect(() => {
    if (!dragState) return

    const exhibitor = exhibitors.find((e) => e.id === dragState.exhibitorId)

    const onMove = (e: MouseEvent) => {
      if (!mapRef.current || !exhibitor) return
      const rect = mapRef.current.getBoundingClientRect()
      const dx = ((e.clientX - dragState.startMouseX) / rect.width) * 100
      const dy = ((e.clientY - dragState.startMouseY) / rect.height) * 100
      const newX = Math.max(0, Math.min(100 - (exhibitor.map_w ?? 10), dragState.startX + dx))
      const newY = Math.max(0, Math.min(100 - (exhibitor.map_h ?? 8), dragState.startY + dy))

      setExhibitors((prev) =>
        prev.map((ex) =>
          ex.id === dragState.exhibitorId ? { ...ex, map_x: newX, map_y: newY } : ex
        )
      )
    }

    const onUp = () => {
      const updated = exhibitors.find((e) => e.id === dragState.exhibitorId)
      if (updated && updated.map_x != null) savePosition(updated)
      setDragState(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragState, exhibitors, savePosition])

  const removeFromMap = useCallback(async (exhibitorId: string) => {
    setExhibitors((prev) =>
      prev.map((e) =>
        e.id === exhibitorId ? { ...e, map_x: null, map_y: null, map_w: null, map_h: null } : e
      )
    )
    setSelectedId(null)
    await fetch(`/api/exhibitors/${exhibitorId}/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_x: null, map_y: null, map_w: null, map_h: null, map_color: null }),
    })
  }, [])

  const changeColor = useCallback(async (exhibitorId: string, color: string) => {
    setExhibitors((prev) =>
      prev.map((e) => (e.id === exhibitorId ? { ...e, map_color: color } : e))
    )
    const updated = exhibitors.find((e) => e.id === exhibitorId)
    if (updated) savePosition({ ...updated, map_color: color })
  }, [exhibitors, savePosition])

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

      // Auto-detect aspect ratio from image
      const img = new Image()
      img.onload = () => {
        const ratio = img.width / img.height
        setAspectInput(ratio.toFixed(2))
      }
      img.src = publicUrl
    }
    setUploading(false)
  }

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

  const selectedExhibitor = selectedId ? exhibitors.find((e) => e.id === selectedId) : null
  const placingNew = selectedExhibitor && selectedExhibitor.map_x == null

  return (
    <div className="flex h-full">
      {/* Vänster sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
        {/* Bildinstallningar */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setImageSettingsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span>Hallplansbild</span>
            <span className="text-gray-400">{imageSettingsOpen ? '▲' : '▼'}</span>
          </button>
          {imageSettingsOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ladda upp bild</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full text-xs border border-gray-300 rounded px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? 'Laddar upp…' : 'Välj fil…'}
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Eller bildadress (URL)</label>
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://…"
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bildförhållande (bredd/höjd)</label>
                <input
                  type="number"
                  step="0.01"
                  value={aspectInput}
                  onChange={(e) => setAspectInput(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
              <button
                onClick={handleImageSettings}
                disabled={saving}
                className="w-full text-xs bg-brand text-white rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Sparar…' : 'Spara inställningar'}
              </button>
            </div>
          )}
        </div>

        {/* Storlekspresets */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setPresetsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span>Monterstorlekar</span>
            <span className="text-gray-400">{presetsOpen ? '▲' : '▼'}</span>
          </button>
          {presetsOpen && (
            <div className="px-4 pb-4 space-y-2">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="flex-1 truncate">{p.name} ({p.width_pct}×{p.height_pct}%)</span>
                  <button
                    onClick={() => deletePreset(p.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              {addingPreset ? (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="Namn (t.ex. Liten)"
                    value={newPreset.name}
                    onChange={(e) => setNewPreset((v) => ({ ...v, name: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-0.5">Bredd %</label>
                      <input
                        type="number"
                        value={newPreset.width_pct}
                        onChange={(e) => setNewPreset((v) => ({ ...v, width_pct: parseFloat(e.target.value) || 10 }))}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-0.5">Höjd %</label>
                      <input
                        type="number"
                        value={newPreset.height_pct}
                        onChange={(e) => setNewPreset((v) => ({ ...v, height_pct: parseFloat(e.target.value) || 8 }))}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Färg</label>
                    <input
                      type="color"
                      value={newPreset.color}
                      onChange={(e) => setNewPreset((v) => ({ ...v, color: e.target.value }))}
                      className="h-6 w-10 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addPreset}
                      disabled={!newPreset.name}
                      className="flex-1 text-xs bg-brand text-white rounded px-2 py-1 disabled:opacity-50"
                    >
                      Lägg till
                    </button>
                    <button
                      onClick={() => setAddingPreset(false)}
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingPreset(true)}
                  className="w-full text-xs text-brand hover:opacity-70 text-left pt-1"
                >
                  + Ny storlek
                </button>
              )}
            </div>
          )}
        </div>

        {/* Aktiv storlek */}
        {presets.length > 0 && (
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-2">Placerar med storlek:</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPresetId(p.id)}
                  className={`text-xs px-2 py-1 rounded border transition-all ${
                    selectedPresetId === p.id
                      ? 'border-brand text-brand font-medium'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Utplacerade utställare */}
        <div className="flex-1 overflow-y-auto">
          {unplaced.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Ej utplacerade ({unplaced.length})
              </p>
              <div className="space-y-1">
                {unplaced.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                    className={`w-full text-left text-xs px-3 py-2 rounded border transition-all ${
                      selectedId === e.id
                        ? 'border-brand bg-brand/5 text-brand font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="block font-medium truncate">{e.company_name}</span>
                    {e.booth_number && <span className="text-gray-400">Monter {e.booth_number}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {placed.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Utplacerade ({placed.length})
              </p>
              <div className="space-y-1">
                {placed.map((e) => (
                  <div
                    key={e.id}
                    className={`text-xs px-3 py-2 rounded border flex items-center gap-2 ${
                      selectedId === e.id ? 'border-brand bg-brand/5' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: e.map_color ?? DEFAULT_COLOR }}
                    />
                    <span className="flex-1 truncate text-gray-700">{e.company_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kartvy */}
      <div className="flex-1 overflow-auto bg-gray-100 flex flex-col">
        {placingNew && (
          <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 text-sm text-brand text-center">
            Klicka på kartan för att placera <strong>{selectedExhibitor.company_name}</strong> — eller välj en annan utställare
          </div>
        )}

        {!mapImageUrl && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-sm font-medium">Ingen hallplansbild inlagd</p>
              <p className="text-xs mt-1">Öppna "Hallplansbild" i sidomenyn och ladda upp en bild</p>
            </div>
          </div>
        )}

        {mapImageUrl && (
          <div className="flex-1 p-6 flex items-start justify-center overflow-auto">
            <div
              className="relative bg-white shadow-lg select-none"
              style={{
                width: '100%',
                maxWidth: '1000px',
                aspectRatio: String(mapAspectRatio),
                cursor: placingNew ? 'crosshair' : 'default',
              }}
              ref={mapRef}
              onClick={handleMapClick}
            >
              <img
                src={mapImageUrl}
                alt="Hallkarta"
                className="absolute inset-0 w-full h-full object-cover rounded"
                draggable={false}
              />

              {placed.map((e) => {
                const isSelected = selectedId === e.id
                return (
                  <div
                    key={e.id}
                    data-booth
                    onMouseDown={(ev) => handleBoothMouseDown(ev, e.id)}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelectedId(e.id === selectedId ? null : e.id)
                    }}
                    className="absolute rounded border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
                    style={{
                      left: `${e.map_x}%`,
                      top: `${e.map_y}%`,
                      width: `${e.map_w}%`,
                      height: `${e.map_h}%`,
                      backgroundColor: e.map_color ?? DEFAULT_COLOR,
                      borderColor: isSelected ? '#1d4ed8' : 'rgba(0,0,0,0.15)',
                      zIndex: isSelected ? 10 : 1,
                      boxShadow: isSelected ? '0 0 0 2px #1d4ed8' : undefined,
                    }}
                  >
                    <span className="text-xs font-semibold text-gray-800 text-center px-1 leading-tight truncate w-full text-center">
                      {e.company_name}
                    </span>
                    {e.booth_number && (
                      <span className="text-[10px] text-gray-600">{e.booth_number}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Höger panel: valda monterns inställningar */}
      {selectedExhibitor && selectedExhibitor.map_x != null && (
        <div className="w-52 border-l border-gray-200 bg-white p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate">{selectedExhibitor.company_name}</p>
            {selectedExhibitor.booth_number && (
              <p className="text-xs text-gray-500">Monter {selectedExhibitor.booth_number}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Färg</label>
            <input
              type="color"
              value={selectedExhibitor.map_color ?? DEFAULT_COLOR}
              onChange={(e) => changeColor(selectedExhibitor.id, e.target.value)}
              className="h-8 w-full rounded border border-gray-300 cursor-pointer"
            />
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Position: {selectedExhibitor.map_x?.toFixed(1)}%, {selectedExhibitor.map_y?.toFixed(1)}%</p>
            <p>Storlek: {selectedExhibitor.map_w?.toFixed(1)}% × {selectedExhibitor.map_h?.toFixed(1)}%</p>
          </div>

          {presets.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ändra storlek</label>
              <div className="space-y-1">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      const updated = {
                        ...selectedExhibitor,
                        map_w: p.width_pct,
                        map_h: p.height_pct,
                      }
                      setExhibitors((prev) => prev.map((e) => (e.id === selectedExhibitor.id ? updated : e)))
                      await savePosition(updated)
                    }}
                    className="w-full text-xs text-left px-2 py-1.5 rounded border border-gray-200 hover:border-brand hover:text-brand"
                  >
                    {p.name} ({p.width_pct}×{p.height_pct}%)
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => removeFromMap(selectedExhibitor.id)}
            className="w-full text-xs text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50"
          >
            Ta bort från karta
          </button>
        </div>
      )}
    </div>
  )
}
