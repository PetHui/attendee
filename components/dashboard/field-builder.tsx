'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RegistrationField, FieldType } from '@/types'

interface FieldItem {
  id: string
  label: string
  field_type: FieldType
  required: boolean
  options: string[]
  sort_order: number
}

function SortableField({
  field,
  onUpdate,
  onDelete,
}: {
  field: FieldItem
  onUpdate: (id: string, updates: Partial<FieldItem>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [optionInput, setOptionInput] = useState('')

  function addOption() {
    if (!optionInput.trim()) return
    onUpdate(field.id, { options: [...field.options, optionInput.trim()] })
    setOptionInput('')
  }

  function removeOption(idx: number) {
    onUpdate(field.id, { options: field.options.filter((_, i) => i !== idx) })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="mt-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none select-none text-lg leading-none"
          aria-label="Dra för att sortera"
        >
          ⠿
        </button>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                value={field.label}
                onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                placeholder="Fältnamn"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={field.field_type}
              onChange={(e) =>
                onUpdate(field.id, { field_type: e.target.value as FieldType })
              }
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text">Text</option>
              <option value="select">Välj alternativ</option>
              <option value="checkbox">Kryssruta</option>
            </select>
          </div>

          {field.field_type === 'select' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Alternativ
              </p>
              {field.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-0.5 text-xs text-gray-700"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                  placeholder="Lägg till alternativ..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  + Lägg till
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-600">Obligatoriskt fält</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => onDelete(field.id)}
          className="text-gray-400 hover:text-red-500 transition-colors text-xl leading-none mt-0.5"
          aria-label="Ta bort fält"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function FieldBuilder({
  eventId,
  initialFields,
}: {
  eventId: string
  initialFields: RegistrationField[]
}) {
  const router = useRouter()
  const [fields, setFields] = useState<FieldItem[]>(
    initialFields.map((f) => ({
      id: f.id,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      options: (f.options as string[]) ?? [],
      sort_order: f.sort_order,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateField = useCallback((id: string, updates: Partial<FieldItem>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }, [])

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }, [])

  function addField() {
    const newField: FieldItem = {
      id: `new-${Date.now()}`,
      label: '',
      field_type: 'text',
      required: false,
      options: [],
      sort_order: fields.length,
    }
    setFields((prev) => [...prev, newField])
  }

  async function saveFields() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const res = await fetch(`/api/events/${eventId}/fields`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Något gick fel')
    } else {
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Formuläret sparades!
        </div>
      )}

      {fields.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Inga fält ännu. Klicka på &quot;Lägg till fält&quot; för att börja bygga formuläret.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onDelete={deleteField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          + Lägg till fält
        </button>
        <button
          type="button"
          onClick={saveFields}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Sparar...' : 'Spara formulär'}
        </button>
      </div>
    </div>
  )
}
