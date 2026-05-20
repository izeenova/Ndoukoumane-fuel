'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { formatCFA, formatDate } from '@/lib/utils'
import type { FacturePDFData } from '@/components/FacturePDFDocument'
import { PieceJointeUpload, type PieceJointeResult } from '@/components/PieceJointeUpload'

// Import dynamique — react-pdf ne supporte pas le SSR
const FacturePreviewModal = dynamic(
  () => import('@/components/FacturePDFActions').then(m => m.FacturePreviewModal),
  { ssr: false, loading: () => null }
)
const FactureDownloadButton = dynamic(
  () => import('@/components/FacturePDFActions').then(m => m.FactureDownloadButton),
  { ssr: false, loading: () => <span className="text-slate-600 text-xs">...</span> }
)

type Facture = FacturePDFData

interface Vehicule {
  id: string
  immatriculation: string
  marque: string
  modele: string
  typeCarburant: 'ESSENCE' | 'GASOIL'
  personnelAssigne: { prenom: string; nom: string } | null
}

const TYPE_LABELS: Record<string, string> = { CARBURANT: 'Carburant', VIDANGE: 'Vidange', AUTRE: 'Autre' }
const TYPE_COLORS: Record<string, string> = {
  CARBURANT: 'bg-blue-500/20 text-blue-400',
  VIDANGE:   'bg-amber-500/20 text-amber-400',
  AUTRE:     'bg-slate-500/20 text-slate-400',
}

interface LigneForm {
  type: 'CARBURANT' | 'VIDANGE' | 'AUTRE'
  typeCarburant: 'ESSENCE' | 'GASOIL'
  saisieMode: 'litres' | 'montant'  // pour CARBURANT uniquement
  description: string
  quantite: string      // litres
  prixUnitaire: string  // prix/litre ou prix unit.
  montant: string       // total FCFA
  notes: string
}

const emptyLigne = (): LigneForm => ({
  type: 'AUTRE', typeCarburant: 'ESSENCE', saisieMode: 'litres',
  description: '', quantite: '', prixUnitaire: '', montant: '', notes: '',
})

// ─── Combobox véhicule ────────────────────────────────────────────────────────
function VehiculeSelect({ vehicules, value, onChange }: {
  vehicules: Vehicule[]
  value: string
  onChange: (id: string, v: Vehicule | null) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = vehicules.find(v => v.id === value) || null
  const filtered = query
    ? vehicules.filter(v =>
        `${v.immatriculation} ${v.marque} ${v.modele} ${v.personnelAssigne?.prenom ?? ''} ${v.personnelAssigne?.nom ?? ''}`
          .toLowerCase().includes(query.toLowerCase())
      )
    : vehicules

  return (
    <div ref={ref} className="relative">
      <div
        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-text focus-within:ring-2 focus-within:ring-purple-500"
        onClick={() => setOpen(true)}
      >
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={open ? query : (selected ? `${selected.immatriculation} — ${selected.marque} ${selected.modele}` : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder="Rechercher véhicule ou chauffeur..."
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none min-w-0"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-3">Aucun résultat</p>
            ) : filtered.map(v => (
              <button key={v.id} type="button"
                onClick={() => { onChange(v.id, v); setQuery(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors ${value === v.id ? 'bg-purple-600/20 text-purple-300' : 'text-white'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.immatriculation}</span>
                  <span className="text-slate-400">{v.marque} {v.modele}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${v.typeCarburant === 'GASOIL' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {v.typeCarburant}
                  </span>
                </div>
                {v.personnelAssigne && (
                  <p className="text-slate-500 text-xs mt-0.5">Chauffeur : {v.personnelAssigne.prenom} {v.personnelAssigne.nom}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FacturesPage() {
  const [factures, setFactures]         = useState<Facture[]>([])
  const [vehicules, setVehicules]       = useState<Vehicule[]>([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [search, setSearch]             = useState('')
  const [dateDebut, setDateDebut]       = useState('')
  const [dateFin, setDateFin]           = useState('')
  const [userRole, setUserRole]         = useState('')
  const [budgetSolde, setBudgetSolde]   = useState<number | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [previewFacture, setPreviewFacture] = useState<Facture | null>(null)

  // Modal
  const [showModal, setShowModal]         = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [formNumero, setFormNumero]       = useState('')
  const [loadingNumero, setLoadingNumero] = useState(false)
  const [formVehicule, setFormVehicule]   = useState('')
  const [formVehiculeObj, setFormVehiculeObj] = useState<Vehicule | null>(null)
  const [formDate, setFormDate]           = useState('')
  const [formNotes, setFormNotes]         = useState('')
  const [lignes, setLignes]               = useState<LigneForm[]>([emptyLigne()])
  const [pieceJointe, setPieceJointe]     = useState<PieceJointeResult | null>(null)

  const fetchFactures = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString() })
    if (search)    params.set('search', search)
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin)   params.set('dateFin', dateFin)
    const res  = await fetch(`/api/factures?${params}`)
    const data = await res.json()
    setFactures(data.factures || [])
    setTotalPages(data.pages || 1)
    setLoading(false)
  }, [page, search, dateDebut, dateFin])

  useEffect(() => { fetchFactures() }, [fetchFactures])

  useEffect(() => {
    fetch('/api/vehicules').then(r => r.json()).then(d => setVehicules(Array.isArray(d) ? d : []))
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
    fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
  }, [])

  // Récupérer le prochain numéro auto — basé sur la date sélectionnée
  const fetchNextNumero = async (date?: string) => {
    setLoadingNumero(true)
    const url = date ? `/api/factures/numero?date=${date}` : '/api/factures/numero'
    const res  = await fetch(url)
    const data = await res.json()
    if (data.numero) setFormNumero(data.numero)
    setLoadingNumero(false)
  }

  // Quand la date change → regénérer le numéro automatiquement
  const handleDateChange = (date: string) => {
    setFormDate(date)
    // Regénérer le numéro si c'est un numéro auto (format YYYYMMDD-XX)
    if (!formNumero || /^\d{8}-\d{2,}$/.test(formNumero)) {
      fetchNextNumero(date || undefined)
    }
  }

  // Mise à jour d'une ligne
  const updateLigne = (idx: number, field: keyof LigneForm, value: string) => {
    setLignes(prev => {
      const next = [...prev]
      const l: LigneForm = { ...next[idx], [field]: value }

      if (l.type === 'CARBURANT') {
        if (l.saisieMode === 'litres') {
          // litres + prixUnitaire → montant
          if ((field === 'quantite' || field === 'prixUnitaire') && l.quantite && l.prixUnitaire) {
            const q = parseFloat(l.quantite)
            const p = parseFloat(l.prixUnitaire)
            if (!isNaN(q) && !isNaN(p)) l.montant = String(Math.round(q * p))
          }
        } else {
          // montant + prixUnitaire → litres
          if ((field === 'montant' || field === 'prixUnitaire') && l.montant && l.prixUnitaire) {
            const m = parseFloat(l.montant)
            const p = parseFloat(l.prixUnitaire)
            if (!isNaN(m) && !isNaN(p) && p > 0) {
              l.quantite = String(Math.round((m / p) * 100) / 100)
            }
          }
        }
      } else {
        // Pour vidange/autre : qte × prix → montant
        if ((field === 'quantite' || field === 'prixUnitaire') && l.quantite && l.prixUnitaire) {
          const q = parseFloat(l.quantite)
          const p = parseFloat(l.prixUnitaire)
          if (!isNaN(q) && !isNaN(p)) l.montant = String(Math.round(q * p))
        }
      }

      next[idx] = l
      return next
    })
  }

  // Changement de mode de saisie (litres ↔ montant) pour une ligne CARBURANT
  const toggleSaisieMode = (idx: number) => {
    setLignes(prev => {
      const next = [...prev]
      const l = { ...next[idx] }
      l.saisieMode = l.saisieMode === 'litres' ? 'montant' : 'litres'
      // Reset les champs calculés
      if (l.saisieMode === 'montant') {
        // On passe en mode montant → on efface les litres si auto-calculés
        l.quantite = ''
      } else {
        // On passe en mode litres → on efface le montant si auto-calculé
        l.montant = ''
      }
      next[idx] = l
      return next
    })
  }

  const handleLigneTypeChange = (idx: number, type: LigneForm['type']) => {
    setLignes(prev => {
      const next = [...prev]
      const l = { ...next[idx], type }
      if (type === 'CARBURANT') {
        l.typeCarburant = formVehiculeObj?.typeCarburant || 'ESSENCE'
        if (!l.description) l.description = 'Plein carburant'
      } else if (type === 'VIDANGE') {
        if (!l.description) l.description = 'Vidange moteur'
        l.saisieMode = 'litres'
      } else {
        l.saisieMode = 'litres'
      }
      next[idx] = l
      return next
    })
  }

  const addLigne    = () => setLignes(prev => [...prev, emptyLigne()])
  const removeLigne = (idx: number) => setLignes(prev => prev.filter((_, i) => i !== idx))

  const totalFacture = lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await fetch('/api/factures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero:          formNumero,
        vehiculeId:      formVehicule,
        date:            formDate || undefined,
        notes:           formNotes || undefined,
        pieceJointe:     pieceJointe?.url      || undefined,
        pieceJointeNom:  pieceJointe?.nom      || undefined,
        pieceJointeType: pieceJointe?.type     || undefined,
        lignes: lignes.map(l => ({
          type:          l.type,
          typeCarburant: l.type === 'CARBURANT' ? l.typeCarburant : undefined,
          description:   l.description,
          quantite:      l.quantite      || undefined,
          prixUnitaire:  l.prixUnitaire  || undefined,
          montant:       l.montant,
          notes:         l.notes || undefined,
        })),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erreur')
    } else {
      setShowModal(false); resetForm(); fetchFactures()
      fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setFormNumero(''); setFormVehicule(''); setFormVehiculeObj(null)
    setFormDate(''); setFormNotes(''); setLignes([emptyLigne()])
    setPieceJointe(null); setError('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ? Le montant total sera remboursé sur la carte essence.')) return
    setDeletingId(id)
    await fetch(`/api/factures/${id}`, { method: 'DELETE' })
    setDeletingId(null); fetchFactures()
    fetch('/api/budget').then(r => r.json()).then(d => { if (d.solde !== undefined) setBudgetSolde(d.solde) })
  }

  const totalAffiche = factures.reduce((s, f) => s + f.total, 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Factures</h2>
          <p className="text-slate-400 text-sm">Sorties groupées par numéro de facture</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {budgetSolde !== null && (
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-4 py-2.5">
              <p className="text-slate-400 text-xs">Budget carte</p>
              <p className="text-white font-bold text-sm">{formatCFA(budgetSolde)}</p>
            </div>
          )}
          <button onClick={() => { resetForm(); fetchNextNumero(); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="N° facture, véhicule, chauffeur..."
            className="w-full bg-[#1E293B] border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-500" />
        </div>
        <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
          className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <span className="text-slate-500 text-sm">→</span>
        <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
          className="bg-[#1E293B] border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        {(dateDebut || dateFin || search) && (
          <button onClick={() => { setSearch(''); setDateDebut(''); setDateFin(''); setPage(1) }}
            className="text-slate-500 hover:text-white text-sm px-3 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors">✕</button>
        )}
      </div>

      {/* KPIs */}
      {factures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Factures affichées</p>
            <p className="text-2xl font-bold text-white">{factures.length}</p>
          </div>
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Total affiché</p>
            <p className="text-2xl font-bold text-red-400">{formatCFA(totalAffiche)}</p>
          </div>
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-xs mb-1">Moy. par facture</p>
            <p className="text-2xl font-bold text-white">{formatCFA(factures.length > 0 ? totalAffiche / factures.length : 0)}</p>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <p className="text-center py-20 text-slate-500 text-sm">Chargement...</p>
        ) : factures.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Aucune facture</p>
            <p className="text-slate-500 text-sm mt-1">Créez une facture pour regrouper des sorties</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {factures.map(f => {
              const isExpanded = expanded === f.id
              return (
                <div key={f.id}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <button onClick={() => setExpanded(isExpanded ? null : f.id)}
                      className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">{f.numero}</span>
                        <span className="text-white font-medium text-sm">{f.vehicule.immatriculation}</span>
                        <span className="text-slate-400 text-sm">{f.vehicule.marque} {f.vehicule.modele}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-slate-500 text-xs">{formatDate(f.date)}</span>
                        {f.vehicule.personnelAssigne && (
                          <span className="text-slate-500 text-xs">· Chauffeur : {f.vehicule.personnelAssigne.prenom} {f.vehicule.personnelAssigne.nom}</span>
                        )}
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-slate-500 text-xs">{f.lignes.length} ligne{f.lignes.length > 1 ? 's' : ''}</span>
                        {f.notes && <span className="text-slate-500 text-xs italic truncate max-w-xs">· {f.notes}</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {Array.from(new Set(f.lignes.map(l => l.type))).map(type => (
                          <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[type]}`}>{TYPE_LABELS[type]}</span>
                        ))}
                        {f.lignes.some(l => l.typeCarburant) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-700 text-slate-400">
                            {Array.from(new Set(f.lignes.filter(l => l.typeCarburant).map(l => l.typeCarburant))).join(' / ')}
                          </span>
                        )}
                        {f.pieceJointe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-500/10 text-green-400">📎 PJ</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right mr-1">
                        <p className="text-red-400 font-bold">{formatCFA(f.total)}</p>
                        <p className="text-slate-500 text-xs">{f.createdBy.name}</p>
                      </div>
                      <button onClick={() => setPreviewFacture(f)} title="Prévisualiser"
                        className="text-slate-500 hover:text-purple-400 transition-colors p-1.5 rounded-lg hover:bg-purple-500/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <FactureDownloadButton facture={f} />
                      {userRole === 'ADMIN' && (
                        <button onClick={() => handleDelete(f.id)} disabled={deletingId === f.id}
                          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 p-1.5 rounded-lg hover:bg-red-500/10">
                          {deletingId === f.id
                            ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 ml-8 space-y-3">
                      <div className="bg-[#0F172A] rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800">
                              <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Type</th>
                              <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Description</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Qté</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Prix unit.</th>
                              <th className="text-right px-4 py-2.5 text-slate-500 text-xs font-medium">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {f.lignes.map(l => (
                              <tr key={l.id}>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium w-fit ${TYPE_COLORS[l.type]}`}>{TYPE_LABELS[l.type]}</span>
                                    {l.typeCarburant && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${l.typeCarburant === 'GASOIL' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {l.typeCarburant}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-300">{l.description}</td>
                                <td className="px-4 py-2.5 text-right text-slate-400">
                                  {l.quantite != null ? `${l.quantite}${l.type === 'CARBURANT' ? ' L' : ''}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-400">
                                  {l.prixUnitaire != null ? formatCFA(l.prixUnitaire) : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-white font-medium">{formatCFA(l.montant)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-700">
                              <td colSpan={4} className="px-4 py-2.5 text-right text-slate-400 text-xs font-medium">TOTAL</td>
                              <td className="px-4 py-2.5 text-right text-red-400 font-bold">{formatCFA(f.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {f.pieceJointe && (
                        <div className="bg-[#0F172A] rounded-xl border border-slate-800 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                            <p className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              Pièce jointe — {f.pieceJointeNom || 'Facture physique'}
                            </p>
                            <a href={f.pieceJointe} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Ouvrir
                            </a>
                          </div>
                          {f.pieceJointeType?.startsWith('image/') ? (
                            <a href={f.pieceJointe} target="_blank" rel="noopener noreferrer">
                              <img src={f.pieceJointe} alt={f.pieceJointeNom || 'Facture'} className="w-full max-h-72 object-contain bg-slate-900 hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={f.pieceJointe} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors group">
                              <div className="w-10 h-12 bg-red-500/20 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-slate-300 text-sm font-medium">{f.pieceJointeNom}</p>
                                <p className="text-slate-500 text-xs mt-0.5">Cliquer pour ouvrir</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-800/60 flex items-center justify-between">
            <p className="text-slate-500 text-xs">Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs">← Préc.</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs">Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal prévisualisation PDF ── */}
      {previewFacture && (
        <FacturePreviewModal facture={previewFacture} onClose={() => setPreviewFacture(null)} />
      )}

      {/* ── Modal création ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-2xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Nouvelle facture</h3>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}

              {/* N° + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">N° de facture *</label>
                  <div className="flex gap-2">
                    <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} required
                      placeholder={loadingNumero ? 'Génération...' : '20260512-01'}
                      className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                    <button type="button" onClick={() => fetchNextNumero(formDate || undefined)} disabled={loadingNumero}
                      title="Regénérer le numéro"
                      className="px-3 py-2.5 bg-[#0F172A] border border-slate-700 rounded-xl text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors disabled:opacity-40">
                      <svg className={`w-4 h-4 ${loadingNumero ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs mt-1">Numéro auto basé sur la date. Modifiable.</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Date de la facture</label>
                  <input type="date" value={formDate} onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p className="text-slate-600 text-xs mt-1">Le numéro s&apos;adapte à la date choisie.</p>
                </div>
              </div>

              {/* Véhicule */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Véhicule *</label>
                <VehiculeSelect
                  vehicules={vehicules}
                  value={formVehicule}
                  onChange={(id, v) => { setFormVehicule(id); setFormVehiculeObj(v) }}
                />
                <input type="hidden" value={formVehicule} required />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Notes <span className="text-slate-500">(optionnel)</span></label>
                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder="Commentaire, référence fournisseur..."
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-slate-300 font-medium">Lignes de la facture *</label>
                  <button type="button" onClick={addLigne}
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-3">
                  {lignes.map((l, idx) => (
                    <div key={idx} className="bg-[#0F172A] rounded-xl p-4 border border-slate-800 relative">
                      {lignes.length > 1 && (
                        <button type="button" onClick={() => removeLigne(idx)}
                          className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      <div className="space-y-3">
                        {/* Type principal */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1.5">Type de prestation</label>
                          <div className="flex gap-2">
                            {(['CARBURANT', 'VIDANGE', 'AUTRE'] as const).map(t => (
                              <button key={t} type="button"
                                onClick={() => handleLigneTypeChange(idx, t)}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                  l.type === t
                                    ? t === 'CARBURANT' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                                    : t === 'VIDANGE'   ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                                    : 'bg-slate-600/30 border-slate-500/50 text-slate-300'
                                    : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                                }`}>
                                {TYPE_LABELS[t]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* TypeCarburant + Mode saisie — seulement si CARBURANT */}
                        {l.type === 'CARBURANT' && (
                          <div className="space-y-2">
                            {/* Type carburant */}
                            <div className="flex gap-2">
                              {(['ESSENCE', 'GASOIL'] as const).map(tc => (
                                <button key={tc} type="button"
                                  onClick={() => updateLigne(idx, 'typeCarburant', tc)}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    l.typeCarburant === tc
                                      ? tc === 'GASOIL'
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                        : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                      : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'
                                  }`}>
                                  {tc === 'ESSENCE' ? '⛽ Essence' : '🛢️ Gasoil'}
                                </button>
                              ))}
                            </div>
                            {/* Mode saisie toggle */}
                            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
                              <button type="button" onClick={() => toggleSaisieMode(idx)}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${l.saisieMode === 'litres' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                Litres → Montant
                              </button>
                              <button type="button" onClick={() => toggleSaisieMode(idx)}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${l.saisieMode === 'montant' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                Montant → Litres
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Description *</label>
                          <input type="text" value={l.description}
                            onChange={e => updateLigne(idx, 'description', e.target.value)} required
                            placeholder={l.type === 'CARBURANT' ? 'Plein carburant' : l.type === 'VIDANGE' ? 'Vidange moteur' : 'Détail de la prestation...'}
                            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>

                        {/* Champs selon le type + mode */}
                        {l.type === 'CARBURANT' && l.saisieMode === 'litres' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Litres</label>
                              <input type="number" step="0.01" min="0" value={l.quantite}
                                onChange={e => updateLigne(idx, 'quantite', e.target.value)}
                                placeholder="ex: 50.00"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Prix/litre (FCFA)</label>
                              <input type="number" step="1" min="0" value={l.prixUnitaire}
                                onChange={e => updateLigne(idx, 'prixUnitaire', e.target.value)}
                                placeholder="ex: 650"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            {/* Montant calculé */}
                            <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Montant total (FCFA) *</label>
                              <input type="number" step="1" min="1" value={l.montant}
                                onChange={e => updateLigne(idx, 'montant', e.target.value)} required
                                placeholder="Montant total"
                                className="w-full bg-[#1E293B] border border-blue-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                              {l.quantite && l.prixUnitaire && (
                                <p className="text-xs text-blue-400 mt-1">
                                  {parseFloat(l.quantite) || 0} L × {parseFloat(l.prixUnitaire) || 0} FCFA/L = {Math.round((parseFloat(l.quantite)||0)*(parseFloat(l.prixUnitaire)||0)).toLocaleString('fr-FR')} FCFA
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {l.type === 'CARBURANT' && l.saisieMode === 'montant' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Montant total (FCFA) *</label>
                              <input type="number" step="1" min="1" value={l.montant}
                                onChange={e => updateLigne(idx, 'montant', e.target.value)} required
                                placeholder="ex: 25000"
                                className="w-full bg-[#1E293B] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Prix/litre (FCFA)</label>
                              <input type="number" step="1" min="0" value={l.prixUnitaire}
                                onChange={e => updateLigne(idx, 'prixUnitaire', e.target.value)}
                                placeholder="ex: 650"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            {/* Litres calculés */}
                            <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Litres correspondants <span className="text-slate-600">(auto-calculé)</span></label>
                              <div className="bg-[#1E293B] border border-purple-500/20 rounded-lg px-3 py-2 text-purple-300 text-sm font-mono">
                                {l.montant && l.prixUnitaire && parseFloat(l.prixUnitaire) > 0
                                  ? `${Math.round((parseFloat(l.montant)/parseFloat(l.prixUnitaire))*100)/100} L`
                                  : <span className="text-slate-600">Entrer montant + prix/litre</span>
                                }
                              </div>
                            </div>
                          </div>
                        )}

                        {l.type !== 'CARBURANT' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Quantité <span className="text-slate-600">(optionnel)</span></label>
                              <input type="number" step="0.01" min="0" value={l.quantite}
                                onChange={e => updateLigne(idx, 'quantite', e.target.value)}
                                placeholder="ex: 1"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Prix unitaire <span className="text-slate-600">(optionnel)</span></label>
                              <input type="number" step="1" min="0" value={l.prixUnitaire}
                                onChange={e => updateLigne(idx, 'prixUnitaire', e.target.value)}
                                placeholder="ex: 15000"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Montant (FCFA) *</label>
                              <input type="number" step="1" min="1" value={l.montant}
                                onChange={e => updateLigne(idx, 'montant', e.target.value)} required
                                placeholder="Montant de cette ligne"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                              {l.quantite && l.prixUnitaire && (
                                <p className="text-xs text-purple-400 mt-1">
                                  Auto-calculé : {Math.round((parseFloat(l.quantite)||0)*(parseFloat(l.prixUnitaire)||0)).toLocaleString('fr-FR')} FCFA
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pièce jointe — optionnelle */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm text-slate-300 font-medium">Pièce jointe (facture physique)</label>
                  <span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-medium">Optionnelle</span>
                </div>
                <p className="text-slate-500 text-xs mb-3">
                  Photo ou scan de la facture papier. Peut être ajoutée ultérieurement.
                </p>
                <PieceJointeUpload value={pieceJointe} onChange={setPieceJointe} />
              </div>

              {/* Total */}
              {totalFacture > 0 && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-purple-400 text-sm font-medium">Total facture</p>
                    <p className="text-slate-500 text-xs mt-0.5">{lignes.length} ligne{lignes.length > 1 ? 's' : ''} · déduit de la carte essence</p>
                  </div>
                  <p className="text-purple-300 font-bold text-xl">{formatCFA(totalFacture)}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit"
                  disabled={submitting || !formVehicule || totalFacture <= 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  {submitting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {submitting ? 'Enregistrement...' : `Valider — ${formatCFA(totalFacture)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
