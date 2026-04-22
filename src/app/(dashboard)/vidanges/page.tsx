'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCFA, formatDateTime } from '@/lib/utils'

interface Vidange {
  id: string
  cout: number
  date: string
  notes: string | null
  vehicule: { immatriculation: string; marque: string; modele: string }
  createdBy: { name: string }
}

interface Vehicule {
  id: string
  immatriculation: string
  marque: string
  modele: string
}

const emptyForm = { vehiculeId: '', cout: '', date: '', notes: '' }

function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  onSelect,
  renderOption,
  renderSelected,
  required,
}: {
  label: string
  placeholder: string
  value: string
  options: any[]
  onSelect: (id: string) => void
  renderOption: (item: any) => React.ReactNode
  renderSelected: (item: any) => string
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const selected = options.find(o => o.id === value)
  const filtered = query
    ? options.filter(o => renderSelected(o).toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm text-slate-300 mb-1.5">{label} {required && '*'}</label>
      <div
        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent"
        onClick={() => setOpen(true)}
      >
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={open ? query : (selected ? renderSelected(selected) : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder={selected ? renderSelected(selected) : placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none min-w-0"
          required={required && !value}
        />
        <svg className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucun résultat</p>
            ) : filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.id); setQuery(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors ${
                  value === item.id ? 'bg-amber-600/20 text-amber-300' : 'text-white'
                }`}
              >
                {renderOption(item)}
              </button>
            ))}
          </div>
        </div>
      )}

      <input type="hidden" value={value} required={required} />
    </div>
  )
}

export default function VidangesPage() {
  const [vidanges, setVidanges] = useState<Vidange[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [loading, setLoading] = useState(true)
  const [totalDepenses, setTotalDepenses] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [searchVehicule, setSearchVehicule] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userRole, setUserRole] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString() })
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin) params.set('dateFin', dateFin)
    if (searchVehicule) params.set('searchVehicule', searchVehicule)
    const res = await fetch(`/api/vidanges?${params}`)
    const data = await res.json()
    setVidanges(data.vidanges || [])
    setTotalPages(data.pages || 1)
    const total = (data.vidanges || []).reduce((s: number, v: Vidange) => s + v.cout, 0)
    setTotalDepenses(total)
    setLoading(false)
  }, [page, dateDebut, dateFin, searchVehicule])

  const fetchVehicules = async () => {
    const res = await fetch('/api/vehicules?statut=ACTIF')
    const data = await res.json()
    setVehicules(Array.isArray(data) ? data : [])
  }

  const fetchSession = async () => {
    const res = await fetch('/api/auth/session')
    const data = await res.json()
    setUserRole(data?.user?.role || '')
  }

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchVehicules(); fetchSession() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/vidanges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculeId: form.vehiculeId, cout: form.cout, date: form.date, notes: form.notes }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erreur')
    } else {
      setShowModal(false)
      setForm(emptyForm)
      fetchData()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette vidange ?')) return
    await fetch(`/api/vidanges/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Vidanges</h2>
          <p className="text-slate-400 text-sm">{vidanges.length} vidange{vidanges.length !== 1 ? 's' : ''} affichée{vidanges.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle vidange
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-[#1E293B] rounded-xl border border-amber-500/20 p-4">
          <p className="text-slate-400 text-xs mb-1">Total dépenses vidanges (filtre)</p>
          <p className="text-white text-xl font-bold">{formatCFA(totalDepenses)}</p>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l4 4v4a2 2 0 01-2 2h-1m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <input
            type="text"
            value={searchVehicule}
            onChange={e => { setSearchVehicule(e.target.value); setPage(1) }}
            placeholder="Rechercher une plaque, marque, modèle..."
            className="w-full bg-[#1E293B] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date début</label>
            <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
              className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date fin</label>
            <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
              className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {(dateDebut || dateFin || searchVehicule) && (
            <button
              onClick={() => { setDateDebut(''); setDateFin(''); setSearchVehicule(''); setPage(1) }}
              className="px-3 py-2.5 text-slate-400 hover:text-white text-sm rounded-xl border border-slate-700 hover:border-slate-600 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Coût</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Notes</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Enregistré par</th>
                {userRole === 'ADMIN' && (
                  <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : vidanges.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Aucune vidange enregistrée</td></tr>
              ) : vidanges.map(v => (
                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white text-sm">{formatDateTime(v.date)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white font-semibold text-sm">{v.vehicule.immatriculation}</p>
                    <p className="text-slate-500 text-xs">{v.vehicule.marque} {v.vehicule.modele}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-amber-400 font-bold text-sm">{formatCFA(v.cout)}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-slate-400 text-sm truncate max-w-48">{v.notes || '—'}</p>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <p className="text-slate-400 text-sm">{v.createdBy.name}</p>
                  </td>
                  {userRole === 'ADMIN' && (
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">
              Précédent
            </button>
            <span className="text-slate-400 text-sm">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Nouvelle vidange</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>
              )}

              <SearchableSelect
                label="Véhicule"
                placeholder="Chercher une plaque, marque..."
                value={form.vehiculeId}
                options={vehicules}
                onSelect={id => setForm(f => ({ ...f, vehiculeId: id }))}
                renderSelected={v => `${v.immatriculation} — ${v.marque} ${v.modele}`}
                renderOption={v => (
                  <div>
                    <span className="font-semibold">{v.immatriculation}</span>
                    <span className="text-slate-400"> — {v.marque} {v.modele}</span>
                  </div>
                )}
                required
              />

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Prix de la vidange (FCFA) *</label>
                <input
                  type="number"
                  value={form.cout}
                  onChange={e => setForm(f => ({ ...f, cout: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex : 15000"
                  required
                  min="1"
                  step="1"
                />
              </div>

              {form.cout && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-amber-300 text-sm">Coût total</span>
                  <span className="text-white font-bold">{formatCFA(parseFloat(form.cout))}</span>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Date et heure</label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  rows={2}
                  placeholder="Optionnel — ex : Huile 5W40, filtre changé..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
