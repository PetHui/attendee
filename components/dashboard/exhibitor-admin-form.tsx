'use client'

import { useState } from 'react'

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

interface Offer {
  id: string
  title: string
  description: string | null
  redemptions: { id: string; participant_id: string; redeemed_at: string }[]
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

type Tab = 'grundinfo' | 'kontakter' | 'fakturering' | 'erbjudande'

export default function ExhibitorAdminForm({
  exhibitor: initial,
  contacts: initialContacts,
  billing: initialBilling,
  offers: initialOffers,
}: {
  exhibitor: Exhibitor
  contacts: Contact[]
  billing: Billing | null
  offers: Offer[]
}) {
  const [tab, setTab] = useState<Tab>('grundinfo')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Grundinfo
  const [info, setInfo] = useState({
    company_name: initial.company_name,
    description: initial.description ?? '',
    website: initial.website ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    booth_number: initial.booth_number ?? '',
    status: initial.status,
  })

  // Kontakter
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '' })

  // Fakturering
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

  // Erbjudande
  const [offer, setOffer] = useState<Partial<Offer>>(
    initialOffers[0] ?? { title: '', description: '' }
  )

  async function saveInfo() {
    setSaving(true)
    const res = await fetch(`/api/exhibitors/${initial.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    })
    setSaving(false)
    if (res.ok) flash()
  }

  async function saveBilling() {
    setSaving(true)
    await fetch(`/api/exhibitors/${initial.id}/billing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billing),
    })
    setSaving(false)
    flash()
  }

  async function saveOffer() {
    setSaving(true)
    const res = await fetch(`/api/exhibitors/${initial.id}/offer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: offer.title, description: offer.description }),
    })
    const data = await res.json()
    if (data.offer) setOffer(data.offer)
    setSaving(false)
    flash()
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!newContact.name.trim()) return
    setSaving(true)
    const res = await fetch(`/api/exhibitors/${initial.id}/contacts`, {
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
    await fetch(`/api/exhibitors/${initial.id}/contacts/${contactId}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'grundinfo', label: 'Grundinfo' },
    { key: 'kontakter', label: 'Kontakter' },
    { key: 'fakturering', label: 'Fakturering' },
    { key: 'erbjudande', label: 'Erbjudande' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Flikar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-brand border-b-2 border-brand bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Grundinfo */}
        {tab === 'grundinfo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Företagsnamn" required>
                <input
                  type="text"
                  value={info.company_name}
                  onChange={(e) => setInfo((f) => ({ ...f, company_name: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Monternummer">
                <input
                  type="text"
                  value={info.booth_number}
                  onChange={(e) => setInfo((f) => ({ ...f, booth_number: e.target.value }))}
                  className={inputCls}
                  placeholder="A12"
                />
              </Field>
            </div>
            <Field label="Beskrivning">
              <textarea
                rows={4}
                value={info.description}
                onChange={(e) => setInfo((f) => ({ ...f, description: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Webbplats">
                <input
                  type="url"
                  value={info.website}
                  onChange={(e) => setInfo((f) => ({ ...f, website: e.target.value }))}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>
              <Field label="E-post">
                <input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefon">
                <input
                  type="tel"
                  value={info.phone}
                  onChange={(e) => setInfo((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Status">
                <select
                  value={info.status}
                  onChange={(e) =>
                    setInfo((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))
                  }
                  className={inputCls}
                >
                  <option value="draft">Utkast</option>
                  <option value="published">Publicerad</option>
                </select>
              </Field>
            </div>
            <SaveBar saving={saving} saved={saved} onSave={saveInfo} />
          </div>
        )}

        {/* Kontakter */}
        {tab === 'kontakter' && (
          <div className="space-y-4">
            {contacts.length > 0 && (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg mb-4">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {c.name} {c.is_primary && <span className="text-xs text-brand ml-1">(primär)</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[c.role, c.email, c.phone].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeContact(c.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addContact} className="space-y-3 border border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">Lägg till kontaktperson</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Namn" required>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Roll">
                  <input
                    type="text"
                    value={newContact.role}
                    onChange={(e) => setNewContact((f) => ({ ...f, role: e.target.value }))}
                    className={inputCls}
                    placeholder="VD, Säljare..."
                  />
                </Field>
                <Field label="E-post">
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Lägg till
              </button>
            </form>
          </div>
        )}

        {/* Fakturering */}
        {tab === 'fakturering' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Företagsnamn (faktura)">
                <input
                  type="text"
                  value={billing.company_name ?? ''}
                  onChange={(e) => setBilling((f) => ({ ...f, company_name: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Org.nummer">
                <input
                  type="text"
                  value={billing.org_number ?? ''}
                  onChange={(e) => setBilling((f) => ({ ...f, org_number: e.target.value }))}
                  className={inputCls}
                  placeholder="556xxx-xxxx"
                />
              </Field>
              <Field label="Momsregistreringsnr">
                <input
                  type="text"
                  value={billing.vat_number ?? ''}
                  onChange={(e) => setBilling((f) => ({ ...f, vat_number: e.target.value }))}
                  className={inputCls}
                  placeholder="SE556xxx-xxxx01"
                />
              </Field>
              <Field label="Faktura-e-post">
                <input
                  type="email"
                  value={billing.billing_email ?? ''}
                  onChange={(e) => setBilling((f) => ({ ...f, billing_email: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Fakturaadress">
              <textarea
                rows={3}
                value={billing.billing_address ?? ''}
                onChange={(e) => setBilling((f) => ({ ...f, billing_address: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Referens/märkning">
              <input
                type="text"
                value={billing.billing_reference ?? ''}
                onChange={(e) => setBilling((f) => ({ ...f, billing_reference: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <SaveBar saving={saving} saved={saved} onSave={saveBilling} />
          </div>
        )}

        {/* Erbjudande */}
        {tab === 'erbjudande' && (
          <div className="space-y-4">
            <Field label="Rubrik">
              <input
                type="text"
                value={offer.title ?? ''}
                onChange={(e) => setOffer((f) => ({ ...f, title: e.target.value }))}
                className={inputCls}
                placeholder="10% rabatt på..."
              />
            </Field>
            <Field label="Beskrivning">
              <textarea
                rows={4}
                value={offer.description ?? ''}
                onChange={(e) => setOffer((f) => ({ ...f, description: e.target.value }))}
                className={inputCls}
                placeholder="Beskriv erbjudandet..."
              />
            </Field>
            <SaveBar saving={saving} saved={saved} onSave={saveOffer} />

            {/* Inlösta erbjudanden */}
            {offer.id && (initialOffers[0]?.redemptions?.length ?? 0) > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Inlösta erbjudanden ({initialOffers[0].redemptions.length})
                </p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {initialOffers[0].redemptions.map((r) => (
                    <div key={r.id} className="px-4 py-2.5 flex justify-between text-sm">
                      <span className="text-gray-600 font-mono text-xs">{r.participant_id.slice(0, 8)}…</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(r.redeemed_at).toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'

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

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? 'Sparar...' : 'Spara'}
      </button>
      {saved && <span className="text-sm text-green-600">Sparat!</span>}
    </div>
  )
}
