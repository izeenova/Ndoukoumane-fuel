'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCFA, formatDateTime, formatLitres } from '@/lib/utils'

interface Reparation {
  id: string
  description: string
  cout: number
  date: string
  pieces: string | null
  notes: string | null
  vehicule: { immatriculation: string; marque: string; modele: string }
  personnel: { nom: string; prenom: string } | null
  createdBy: { name: string }
}

interface Vehicule { id: string; immatriculation: string; marque: string; modele: string; personnelAssigne: { id: string; prenom: string; nom: string } | null }
interface Personnel { id: string; nom: string; prenom: string; role: string }

// ─── Combobox recherchable pour véhicules ─────────────────────────────────────
function VehiculeSelect({ vehicules, value, onSelect, required }: {
  vehicules: Vehicule[]; value: string; onSelect: (id: string) => void; required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (!value) setQuery('') }, [value])

  const selected = vehicules.find(v => v.id === value)
  const filtered = query
    ? vehicules.filter(v =>
        `${v.immatriculation} ${v.marque} ${v.modele} ${v.personnelAssigne?.prenom ?? ''} ${v.personnelAssigne?.nom ?? ''}`
          .toLowerCase().includes(query.toLowerCase())
      )
    : vehicules

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm text-slate-300 mb-1.5">Véhicule *</label>
      <div className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setOpen(true)}>
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={open ? query : (selected ? `${selected.immatriculation} — ${selected.marque} ${selected.modele}${selected.personnelAssigne ? ` (${selected.personnelAssigne.prenom} ${selected.personnelAssigne.nom})` : ''}` : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder="Chercher plaque, marque, chauffeur..."
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none min-w-0 text-sm" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucun résultat</p>
            ) : filtered.map(v => (
              <button key={v.id} type="button" onClick={() => { onSelect(v.id); setQuery(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors ${value === v.id ? 'bg-blue-600/20 text-blue-300' : 'text-white'}`}>
                <span className="font-semibold">{v.immatriculation}</span>
                <span className="text-slate-400"> — {v.marque} {v.modele}</span>
                {v.personnelAssigne && <span className="text-slate-500 text-xs ml-2">({v.personnelAssigne.prenom} {v.personnelAssigne.nom})</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <input type="hidden" value={value} />
    </div>
  )
}

const emptyForm = { vehiculeId: '', personnelId: '', description: '', cout: '', date: '', pieces: '', notes: '', vehiculeStatut: 'EN_REPARATION' }

export default function ReparationsPage() {
  const [reparations, setReparations] = useState<Reparation[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [mecanos, setMecanos] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCout, setTotalCout] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Reparation | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userRole, setUserRole]             = useState('')
  const [suppressions, setSuppressions]     = useState<{ id: string; description: string; montant: number; createdAt: string; createdBy: { name: string } }[]>([])
  const [showSuppressions, setShowSuppressions] = useState(false)
  const [mecanoSearch, setMecanoSearch]     = useState('')
  const [mecanoOpen, setMecanoOpen]         = useState(false)
  const [showNewMecano, setShowNewMecano]   = useState(false)
  const [newMecanoForm, setNewMecanoForm]   = useState({ prenom: '', nom: '' })
  const mecanoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (mecanoRef.current && !mecanoRef.current.contains(e.target as Node)) { setMecanoOpen(false); setShowNewMecano(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString() })
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin) params.set('dateFin', dateFin)
    const res = await fetch(`/api/reparations?${params}`)
    const data = await res.json()
    setReparations(data.reparations || [])
    setTotalPages(data.pages || 1)
    setTotalCout((data.reparations || []).reduce((s: number, r: Reparation) => s + r.cout, 0))
    setLoading(false)
  }, [page, dateDebut, dateFin])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    fetch('/api/vehicules').then(r => r.json()).then(d => setVehicules(Array.isArray(d) ? d : []))
    fetch('/api/personnel?role=MECANO').then(r => r.json()).then(d => setMecanos(Array.isArray(d) ? d.filter((p: any) => p.actif) : []))
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
  }, [])

  const fetchSuppressions = async () => {
    const res  = await fetch('/api/reparations/suppressions')
    const data = await res.json()
    setSuppressions(Array.isArray(data) ? data : [])
  }

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (r: Reparation) => {
    setEditItem(r)
    setForm({ vehiculeId: '', personnelId: r.personnel?.prenom || '', description: r.description, cout: r.cout.toString(), date: '', pieces: r.pieces || '', notes: r.notes || '', vehiculeStatut: '' })
    setError(''); setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    const url = editItem ? `/api/reparations/${editItem.id}` : '/api/reparations'
    const method = editItem ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur') } else { setShowModal(false); fetchData() }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette réparation ? Elle sera enregistrée dans l\'historique.')) return
    await fetch(`/api/reparations/${id}`, { method: 'DELETE' })
    fetchData()
    if (showSuppressions) fetchSuppressions()
  }

  const handleCreateMecano = async () => {
    if (!newMecanoForm.prenom.trim() || !newMecanoForm.nom.trim()) return
    const res = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMecanoForm, role: 'MECANO' }),
    })
    const data = await res.json()
    if (res.ok) {
      setForm(f => ({ ...f, personnelId: data.id }))
      setMecanos(prev => [...prev, data])
      setNewMecanoForm({ prenom: '', nom: '' })
      setShowNewMecano(false)
      setMecanoOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Réparations</h2>
          <p className="text-slate-400 text-sm">{reparations.length} réparation{reparations.length !== 1 ? 's' : ''} affichée{reparations.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle réparation
        </button>
      </div>

      {/* Total coût */}
      <div className="bg-[#1E293B] rounded-xl border border-orange-500/20 p-4">
        <p className="text-slate-400 text-xs mb-1">Coût total réparations (filtre)</p>
        <p className="text-white text-2xl font-bold">{formatCFA(totalCout)}</p>
      </div>

      {/* Filtres date */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date début</label>
          <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
            className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date fin</label>
          <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
            className="bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(dateDebut || dateFin) && (
          <button onClick={() => { setDateDebut(''); setDateFin(''); setPage(1) }}
            className="px-3 py-2.5 text-slate-400 hover:text-white text-sm rounded-xl border border-slate-700 hover:border-slate-600">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-left px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Mécanicien</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Coût</th>
                <th className="text-right px-5 py-3.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Chargement...</td></tr>
              ) : reparations.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Aucune réparation enregistrée</td></tr>
              ) : reparations.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white text-sm">{formatDateTime(r.date)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white font-semibold text-sm">{r.vehicule.immatriculation}</p>
                    <p className="text-slate-500 text-xs">{r.vehicule.marque} {r.vehicule.modele}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-white text-sm">{r.description}</p>
                    {r.pieces && <p className="text-slate-500 text-xs mt-0.5">Pièces: {r.pieces}</p>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <p className="text-slate-300 text-sm">
                      {r.personnel ? `${r.personnel.prenom} ${r.personnel.nom}` : '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-orange-400 font-bold text-sm">{formatCFA(r.cout)}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">← Précédent</button>
            <span className="text-slate-400 text-sm">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">Suivant →</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl modal-animate max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 sticky top-0 bg-[#1E293B]">
              <h3 className="text-white font-semibold">{editItem ? 'Modifier la réparation' : 'Nouvelle réparation'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
              {!editItem && (
                <VehiculeSelect vehicules={vehicules} value={form.vehiculeId}
                  onSelect={id => setForm(f => ({ ...f, vehiculeId: id }))} required />
              )}
              <div ref={mecanoRef} className="relative">
                <label className="block text-sm text-slate-300 mb-1.5">Mécanicien</label>
                <div className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
                  onClick={() => setMecanoOpen(true)}>
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" value={mecanoOpen ? mecanoSearch : (mecanos.find(m => m.id === form.personnelId) ? `${mecanos.find(m => m.id === form.personnelId)!.prenom} ${mecanos.find(m => m.id === form.personnelId)!.nom}` : '')}
                    onChange={e => { setMecanoSearch(e.target.value); setMecanoOpen(true) }}
                    onFocus={() => { setMecanoSearch(''); setMecanoOpen(true) }}
                    placeholder="Chercher un mécanicien..."
                    className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none min-w-0 text-sm" />
                </div>
                {mecanoOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                    {showNewMecano ? (
                      <div className="p-4 space-y-3">
                        <p className="text-slate-300 text-sm font-medium">Nouveau mécanicien</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={newMecanoForm.prenom} onChange={e => setNewMecanoForm(f => ({ ...f, prenom: e.target.value }))}
                            placeholder="Prénom *" className="bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <input type="text" value={newMecanoForm.nom} onChange={e => setNewMecanoForm(f => ({ ...f, nom: e.target.value }))}
                            placeholder="Nom *" className="bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowNewMecano(false)}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium">Annuler</button>
                          <button type="button" onClick={handleCreateMecano}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">Ajouter</button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        <button type="button" onClick={() => { setShowNewMecano(true); setMecanoSearch('') }}
                          className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-slate-800 font-medium flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Nouveau mécanicien...
                        </button>
                        {(mecanoSearch ? mecanos.filter(m => `${m.prenom} ${m.nom}`.toLowerCase().includes(mecanoSearch.toLowerCase())) : mecanos).map(m => (
                          <button key={m.id} type="button" onClick={() => { setForm(f => ({ ...f, personnelId: m.id })); setMecanoOpen(false); setMecanoSearch('') }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors ${form.personnelId === m.id ? 'bg-blue-600/20 text-blue-300' : 'text-white'}`}>
                            {m.prenom} {m.nom}
                          </button>
                        ))}
                        {mecanos.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Aucun mécanicien</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3} placeholder="Décrire la réparation effectuée..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Coût (FCFA) *</label>
                  <input type="number" value={form.cout} onChange={e => setForm(f => ({ ...f, cout: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="150000" required min="0" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Date</label>
                  <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Pièces remplacées</label>
                <input value={form.pieces} onChange={e => setForm(f => ({ ...f, pieces: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Filtre à huile, courroie..." />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Statut véhicule</label>
                <select value={form.vehiculeStatut} onChange={e => setForm(f => ({ ...f, vehiculeStatut: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="EN_REPARATION">En réparation (défaut)</option>
                  <option value="ACTIF">Marquer comme Actif</option>
                  <option value="HORS_SERVICE">Hors service</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {editItem ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Historique suppressions (admin only) ── */}
      {userRole === 'ADMIN' && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => { setShowSuppressions(s => !s); if (!showSuppressions) fetchSuppressions() }}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-slate-300 text-sm font-medium">Historique des suppressions</span>
              <span className="text-slate-500 text-xs">(admin uniquement)</span>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${showSuppressions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSuppressions && (
            <div className="border-t border-slate-700/50">
              {suppressions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Aucune suppression enregistrée</p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {suppressions.map(log => (
                    <div key={log.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-slate-300 text-sm truncate">{log.description}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Supprimé par {log.createdBy.name} · {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-orange-400 text-sm font-semibold flex-shrink-0">{formatCFA(log.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
