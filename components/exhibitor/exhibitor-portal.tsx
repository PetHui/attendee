'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-xl">
      <p className="text-gray-400 text-sm">Startar kamera...</p>
    </div>
  ),
})

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
}

interface Billing {
  id?: string
  company_name: string | null
  org_number: string | null
  vat_number: string | null
  billing_address: string | null
  billing_email: string | null
  billing_reference: string | null
}

interface Redemption {
  id: string
  participant_id: string
  redeemed_at: string
  name?: string
}

interface Offer {
  id?: string
  title: string
  description: string | null
  redemptions?: Redemption[]
}

interface Exhibitor {
  id: string
  company_name: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  booth_number: string | null
  status: 'draft' | 'published'
}

interface Event {
  id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  location: string | null
}

type Tab = 'profil' | 'erbjudande' | 'kontakter' | 'fakturering' | 'scanner'

export default function ExhibitorPortal({
  exhibitor: initial,
  event,
  contacts: initialContacts,
  billing: initialBilling,
  offers: initialOffers,
  editToken,
  brandColor = '#172554',
}: {
  exhibitor: Exhibitor
  event: Event
  contacts: Contact[]
  billing: Billing | null
  offers: Offer[]
  editToken: string
  brandColor?: string
}) {
  const [tab, setTab] = useState<Tab>('profil')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState(initial.status)

  const [info, setInfo] = useState({
    company_name: initial.company_name,
    description: initial.description ?? '',
    website: initial.website ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    booth_number: initial.booth_number ?? '',
  })

  const [offer, setOffer] = useState<Offer>(
    initialOffers[0] ?? { title: '', description: '' }
  )
  const [redemptions, setRedemptions] = useState<Redemption[]>(
    initialOffers[0]?.redemptions ?? []
  )

  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '' })

  const [billing, setBilling] = useState<Billing>(
    initialBilling ?? {
      company_name: '',
      org_number: '',
      vat_number: '',
      billing_address: '',
      billing_email: '',
      billing_reference: '',
    }
  )

  // QR scanner state
  const [scanResult, setScanResult] = useState<{ name?: string; alreadyRedeemed: boolean } | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(true)

  function exportCSV() {
    const rows = [['Namn', 'Tid']]
    for (const r of redemptions) {
      rows.push([
        r.name ?? r.participant_id.slice(0, 8) + '…',
        new Date(r.redeemed_at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      ])
    }
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `besokare-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function saveInfo(newStatus?: 'draft' | 'published') {
    setSaving(true)
    const s = newStatus ?? status
    const res = await fetch(`/api/exhibitor/${editToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...info, status: s }),
    })
    if (res.ok && newStatus) setStatus(newStatus)
    setSaving(false)
    flash()
  }

  async function saveOffer() {
    setSaving(true)
    const res = await fetch(`/api/exhibitor/${editToken}/offer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: offer.title, description: offer.description }),
    })
    const data = await res.json()
    if (data.offer) setOffer((prev) => ({ ...prev, id: data.offer.id }))
    setSaving(false)
    flash()
  }

  async function saveBilling() {
    setSaving(true)
    await fetch(`/api/exhibitor/${editToken}/billing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billing),
    })
    setSaving(false)
    flash()
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!newContact.name.trim()) return
    setSaving(true)
    const res = await fetch(`/api/exhibitor/${editToken}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContact),
    })
    const data = await res.json()
    if (data.contact) {
      setContacts((prev) => [...prev, data.contact])
      setNewContact({ name: '', email: '', phone: '', role: '' })
    }
    setSaving(false)
  }

  async function removeContact(contactId: string) {
    await fetch(`/api/exhibitor/${editToken}/contacts/${contactId}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
  }

  const handleScan = useCallback(
    async (qrCode: string) => {
      if (isScanning) return
      setIsScanning(true)
      setScanResult(null)
      setScanError(null)
      setShowScanner(false)

      try {
        const res = await fetch('/api/redeem-offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode, editToken }),
        })
        const data = await res.json()
        if (!res.ok) {
          setScanError(data.error ?? 'Okänt fel')
        } else {
          setScanResult(data)
          if (!data.alreadyRedeemed) {
            setRedemptions((prev) => [
              { id: data.redemptionId, participant_id: data.participantId, redeemed_at: new Date().toISOString(), name: data.name ?? undefined },
              ...prev,
            ])
          }
        }
      } catch {
        setScanError('Nätverksfel. Kontrollera anslutningen.')
      }

      setTimeout(() => {
        setScanResult(null)
        setScanError(null)
        setShowScanner(true)
        setIsScanning(false)
      }, 4000)
    },
    [isScanning, editToken]
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profil', label: 'Profil' },
    { key: 'erbjudande', label: 'Erbjudande' },
    { key: 'kontakter', label: 'Kontakter' },
    { key: 'fakturering', label: 'Fakturering' },
    { key: 'scanner', label: 'Skanna besökare' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand': brandColor } as React.CSSProperties}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{info.company_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{event.title}</p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {status === 'published' ? 'Publicerad' : 'Utkast'}
            </span>
          </div>
        </div>

        {/* Flikar */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'text-brand border-brand'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Innehåll */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profil */}
        {tab === 'profil' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <Field label="Företagsnamn">
              <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{info.company_name}</p>
              <p className="text-xs text-gray-400 mt-1">Företagsnamnet hanteras av arrangören.</p>
            </Field>
            <Field label="Beskrivning">
              <textarea rows={4} value={info.description} onChange={(e) => setInfo((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Berätta om ert företag..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Webbplats">
                <input type="url" value={info.website} onChange={(e) => setInfo((f) => ({ ...f, website: e.target.value }))} className={inputCls} placeholder="https://..." />
              </Field>
              <Field label="E-post">
                <input type="email" value={info.email} onChange={(e) => setInfo((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Telefon">
                <input type="tel" value={info.phone} onChange={(e) => setInfo((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Monternummer">
                <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{info.booth_number || '–'}</p>
                <p className="text-xs text-gray-400 mt-1">Monternumret hanteras av arrangören.</p>
              </Field>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => saveInfo()}
                disabled={saving}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Sparar...' : status === 'published' ? 'Spara' : 'Spara utkast'}
              </button>
              {status !== 'published' && (
                <button
                  onClick={() => saveInfo('published')}
                  disabled={saving}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Publicera
                </button>
              )}
              {saved && <span className="text-sm text-green-600">Sparat!</span>}
            </div>
          </div>
        )}

        {/* Erbjudande */}
        {tab === 'erbjudande' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Erbjudanden visas tydligt i utställarkatalogen och lockar besökare till er monter.
              </p>
              <Field label="Rubrik">
                <input
                  type="text"
                  value={offer.title}
                  onChange={(e) => setOffer((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex: 10% rabatt på alla produkter under mässan"
                />
              </Field>
              <Field label="Beskrivning">
                <textarea
                  rows={4}
                  value={offer.description ?? ''}
                  onChange={(e) => setOffer((f) => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                  placeholder="Beskriv ert erbjudande mer detaljerat..."
                />
              </Field>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={saveOffer}
                  disabled={saving}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? 'Sparar...' : 'Spara erbjudande'}
                </button>
                {saved && <span className="text-sm text-green-600">Sparat!</span>}
              </div>
            </div>

            {redemptions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-gray-900">
                    Inlösta erbjudanden <span className="text-brand">({redemptions.length})</span>
                  </p>
                  <button
                    onClick={exportCSV}
                    className="text-xs text-brand hover:opacity-70 font-medium"
                  >
                    Exportera CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex justify-between text-sm text-gray-600 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-gray-700">{r.name ?? `${r.participant_id.slice(0, 12)}…`}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.redeemed_at).toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kontakter */}
        {tab === 'kontakter' && (
          <div className="space-y-4">
            {contacts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {c.name} {c.is_primary && <span className="text-xs text-blue-800 ml-1">(primär)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{[c.role, c.email, c.phone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <button onClick={() => removeContact(c.id)} className="text-xs text-red-500 hover:text-red-700">Ta bort</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addContact} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <p className="font-medium text-sm text-gray-900">Lägg till kontaktperson</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Namn" required>
                  <input type="text" required value={newContact.name} onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Roll">
                  <input type="text" value={newContact.role} onChange={(e) => setNewContact((f) => ({ ...f, role: e.target.value }))} className={inputCls} placeholder="VD, Säljare..." />
                </Field>
                <Field label="E-post">
                  <input type="email" value={newContact.email} onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Telefon">
                  <input type="tel" value={newContact.phone} onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                Lägg till
              </button>
            </form>
          </div>
        )}

        {/* Fakturering */}
        {tab === 'fakturering' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Företagsnamn (faktura)">
                <input type="text" value={billing.company_name ?? ''} onChange={(e) => setBilling((f) => ({ ...f, company_name: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Org.nummer">
                <input type="text" value={billing.org_number ?? ''} onChange={(e) => setBilling((f) => ({ ...f, org_number: e.target.value }))} className={inputCls} placeholder="556xxx-xxxx" />
              </Field>
              <Field label="Momsreg.nr">
                <input type="text" value={billing.vat_number ?? ''} onChange={(e) => setBilling((f) => ({ ...f, vat_number: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Faktura-e-post">
                <input type="email" value={billing.billing_email ?? ''} onChange={(e) => setBilling((f) => ({ ...f, billing_email: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Fakturaadress">
              <textarea rows={3} value={billing.billing_address ?? ''} onChange={(e) => setBilling((f) => ({ ...f, billing_address: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Referens/märkning">
              <input type="text" value={billing.billing_reference ?? ''} onChange={(e) => setBilling((f) => ({ ...f, billing_reference: e.target.value }))} className={inputCls} />
            </Field>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button onClick={saveBilling} disabled={saving} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
              {saved && <span className="text-sm text-green-600">Sparat!</span>}
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {tab === 'scanner' && (
          <div className="space-y-4">
            {!offer.id && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                Du behöver lägga till ett erbjudande innan du kan skanna besökare.
              </div>
            )}
            {offer.id && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-700">Skanna besökarens QR-kod</p>
                    <p className="text-xs text-gray-400 mt-0.5">Erbjudande: {offer.title}</p>
                  </div>
                  <div className="p-4">
                    {showScanner && <QrScanner onScan={handleScan} />}

                    {isScanning && !scanResult && !scanError && (
                      <div className="flex items-center justify-center h-48">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">Kontrollerar...</p>
                        </div>
                      </div>
                    )}

                    {scanResult && (
                      <div className={`rounded-xl p-6 text-center ${scanResult.alreadyRedeemed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                        <p className="text-4xl mb-2">{scanResult.alreadyRedeemed ? '⚠️' : '✅'}</p>
                        <p className={`font-bold text-lg ${scanResult.alreadyRedeemed ? 'text-amber-700' : 'text-green-700'}`}>
                          {scanResult.alreadyRedeemed ? 'Redan inlöst' : 'Erbjudande inlöst!'}
                        </p>
                        {scanResult.name && <p className="text-sm text-gray-600 mt-1">{scanResult.name}</p>}
                        <p className="text-xs text-gray-400 mt-3">Kameran återupptas om 4 sekunder...</p>
                      </div>
                    )}

                    {scanError && (
                      <div className="rounded-xl p-6 text-center bg-red-50 border border-red-200">
                        <p className="text-4xl mb-2">❌</p>
                        <p className="text-red-700 font-semibold">{scanError}</p>
                        <p className="text-xs text-gray-400 mt-3">Kameran återupptas om 4 sekunder...</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Inlösta idag <span className="text-brand">({redemptions.length})</span>
                    </p>
                    {redemptions.length > 0 && (
                      <button
                        onClick={exportCSV}
                        className="text-xs text-brand hover:opacity-70 font-medium"
                      >
                        Exportera CSV
                      </button>
                    )}
                  </div>
                  {redemptions.length === 0 ? (
                    <p className="text-sm text-gray-400">Inga inlösta erbjudanden än.</p>
                  ) : (
                    <div className="space-y-1">
                      {redemptions.slice(0, 10).map((r) => (
                        <div key={r.id} className="flex justify-between text-xs text-gray-500">
                          <span>{r.name ?? `${r.participant_id.slice(0, 8)}…`}</span>
                          <span>{new Date(r.redeemed_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-800'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
