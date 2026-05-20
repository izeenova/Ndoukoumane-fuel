'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCFA, formatLitres, getRolePersonnelLabel } from '@/lib/utils'

type Periode = 'mois' | '3mois' | '6mois' | 'annee' | 'tout'

interface ChauffeurStat {
  personnel: { nom: string; prenom: string; role: string }
  litres: number
  coutTotal: number
  nbSorties: number
}

interface VehiculeStat {
  vehicule: { id: string; immatriculation: string; marque: string; modele: string; type: string; chauffeur?: string | null }
  litres: number
  coutCarburant: number
  coutReparations: number
  coutTotal: number
  nbSorties: number
  nbReparations: number
}

const PERIODES: { value: Periode; label: string }[] = [
  { value: 'mois', label: 'Ce mois' },
  { value: '3mois', label: '3 derniers mois' },
  { value: '6mois', label: '6 derniers mois' },
  { value: 'annee', label: 'Cette année' },
  { value: 'tout', label: 'Tout' },
]

const RANK_COLORS = [
  { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/30' },
  { bg: 'bg-slate-400/10', text: 'text-slate-300', border: 'border-slate-400/30' },
  { bg: 'bg-orange-400/10', text: 'text-orange-400', border: 'border-orange-400/30' },
]

export default function StatsPage() {
  const [periode, setPeriode] = useState<Periode>('mois')
  const [loading, setLoading] = useState(true)
  const [classement, setClassement] = useState<ChauffeurStat[]>([])
  const [vehicules, setVehicules] = useState<VehiculeStat[]>([])
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAllChauffeurs, setShowAllChauffeurs] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    setDebug('')
    try {
      const res = await fetch(`/api/stats?periode=${periode}`)
      if (!res.ok) { 
        const errText = await res.text()
        setError(`Erreur ${res.status}: ${errText}`)
        setDebug(`Response: ${errText}`)
        setLoading(false)
        return
      }
      const data = await res.json()
      setDebug(`API OK: classement=${data.classementChauffeurs?.length || 0}, vehicules=${data.coutParVehicule?.length || 0}`)
      setClassement(data.classementChauffeurs || [])
      setVehicules(data.coutParVehicule || [])
    } catch (e: any) {
      setError('Erreur réseau: ' + (e?.message || 'inconnue'))
    }
    setLoading(false)
  }, [periode])

  useEffect(() => { fetchStats() }, [fetchStats])

  const fetchDetail = async (vehiculeId: string) => {
    setDetailLoading(true)
    setDetailId(vehiculeId)
    try {
      const res = await fetch(`/api/vehicules/${vehiculeId}/stats`)
      const data = await res.json()
      if (res.ok) setDetailData(data)
    } catch {}
    setDetailLoading(false)
  }

  // Totaux pour les barres de progression
  const maxLitres = Math.max(...classement.map(c => c.litres), 1)
  const maxCoutVehicule = Math.max(...vehicules.map(v => v.coutTotal), 1)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Statistiques</h2>
          <p className="text-slate-400 text-sm">Analyse des consommations et des coûts</p>
        </div>

        {/* Filtre période */}
        <div className="flex gap-1 bg-[#1E293B] p-1 rounded-xl border border-slate-700/50">
          {PERIODES.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periode === p.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debug (admin uniquement) */}
      {debug && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs">Debug API</p>
            <button onClick={() => setDebug('')} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>
          <p className="text-slate-500 text-xs mt-1 font-mono">{debug}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-400 text-sm">Calcul en cours...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center space-y-3">
          <p className="text-red-400 text-sm font-medium">{error}</p>
          <button onClick={() => fetchStats()}
            className="inline-flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ─── Résumé période ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Total litres carburant</p>
              <p className="text-orange-400 text-xl font-bold">{formatLitres(vehicules.reduce((s, v) => s + v.litres, 0))}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Dépenses carburant</p>
              <p className="text-blue-400 text-xl font-bold">{formatCFA(vehicules.reduce((s, v) => s + v.coutCarburant, 0))}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Dépenses réparations</p>
              <p className="text-amber-400 text-xl font-bold">{formatCFA(vehicules.reduce((s, v) => s + v.coutReparations, 0))}</p>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Véhicules actifs</p>
              <p className="text-white text-xl font-bold">{vehicules.length}</p>
            </div>
          </div>

          {/* ─── Classement Chauffeurs ─────────────────────────────────────── */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v2a4 4 0 01-8 0V4M6 4H4a2 2 0 00-2 2v1c0 3.314 2.686 6 6 6h4c3.314 0 6-2.686 6-6V6a2 2 0 00-2-2h-2M12 14v7m-4 0h8" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Classement des chauffeurs</h3>
                <p className="text-slate-500 text-xs">Par litres consommés</p>
              </div>
            </div>

            {classement.length === 0 && vehicules.length > 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-400 text-sm">Les consommations sont suivies par véhicule (via les factures)</p>
                <p className="text-slate-500 text-xs mt-1">Consultez le tableau ci-dessous pour les détails par véhicule</p>
              </div>
            ) : classement.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">Aucune donnée sur cette période</p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-800/60">
                  {(showAllChauffeurs ? classement : classement.slice(0, 5)).map((c, i) => {
                    const pct = Math.round((c.litres / maxLitres) * 100)
                  return (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {/* Rang */}
                        <div className="w-8 flex justify-center flex-shrink-0">
                          {i < 3 ? (
                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${RANK_COLORS[i].bg} ${RANK_COLORS[i].text} ${RANK_COLORS[i].border}`}>
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold text-sm">#{i + 1}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">
                            {c.personnel.prenom?.[0]}{c.personnel.nom?.[0]}
                          </span>
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-white font-semibold text-sm">
                                {c.personnel.prenom} {c.personnel.nom}
                              </span>
                              <span className="text-slate-500 text-xs ml-2">
                                {getRolePersonnelLabel(c.personnel.role)}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-orange-400 font-bold text-sm">{formatLitres(c.litres)}</p>
                              <p className="text-slate-500 text-xs">{formatCFA(c.coutTotal)}</p>
                            </div>
                          </div>

                          {/* Barre de progression */}
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-orange-400' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-slate-600 text-xs mt-1">{c.nbSorties} sortie{c.nbSorties > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {classement.length > 5 && (
                <button onClick={() => setShowAllChauffeurs(s => !s)}
                  className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors bg-slate-800/30 hover:bg-slate-800/50 rounded-b-xl">
                  {showAllChauffeurs
                    ? `↑ Voir moins (${classement.length - 5} masqués)`
                    : `↓ Voir plus (${classement.length - 5} autres)`}
                </button>
              )}
              </div>
            )}
          </div>

          {/* ─── Coût total par véhicule ───────────────────────────────────── */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l4 4v4a2 2 0 01-2 2h-1m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Coût total par véhicule</h3>
                <p className="text-slate-500 text-xs">Carburant + réparations cumulés</p>
              </div>
            </div>

            {vehicules.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">Aucune activité sur cette période</p>
              </div>
            ) : (
              <>
                {/* Table desktop */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/60">
                        <th className="text-left px-5 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">Véhicule</th>
                        <th className="text-right px-5 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Carburant</th>
                        <th className="text-right px-5 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Réparations</th>
                        <th className="text-right px-5 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">Total</th>
                        <th className="text-left px-5 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wider hidden md:table-cell w-40">Répartition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {vehicules.map((v, i) => {
                        const pct = Math.round((v.coutTotal / maxCoutVehicule) * 100)
                        const pctCarburant = v.coutTotal > 0 ? Math.round((v.coutCarburant / v.coutTotal) * 100) : 0
                        return (
                          <tr key={v.vehicule.id} onClick={() => fetchDetail(v.vehicule.id)} className="hover:bg-slate-800/30 transition-colors cursor-pointer">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {/* Rang */}
                                <span className="text-slate-600 text-xs font-bold w-5 flex-shrink-0">#{i + 1}</span>
                                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l4 4v4a2 2 0 01-2 2h-1m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-white font-semibold text-sm">{v.vehicule.immatriculation}</p>
                                  <p className="text-slate-500 text-xs">{v.vehicule.marque} {v.vehicule.modele}{v.vehicule.chauffeur ? ` · ${v.vehicule.chauffeur}` : ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right hidden sm:table-cell">
                              <p className="text-blue-400 font-medium text-sm">{formatCFA(v.coutCarburant)}</p>
                              <p className="text-slate-600 text-xs">{formatLitres(v.litres)} · {v.nbSorties} sortie{v.nbSorties > 1 ? 's' : ''}</p>
                            </td>
                            <td className="px-5 py-4 text-right hidden sm:table-cell">
                              <p className="text-orange-400 font-medium text-sm">{formatCFA(v.coutReparations)}</p>
                              <p className="text-slate-600 text-xs">{v.nbReparations} répar.</p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <p className="text-white font-bold text-sm">{formatCFA(v.coutTotal)}</p>
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1.5 ml-auto">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              {v.coutTotal > 0 && (
                                <div>
                                  {/* Barre empilée carburant + réparations */}
                                  <div className="h-2 rounded-full overflow-hidden flex w-36">
                                    <div className="bg-blue-500 h-full" style={{ width: `${pctCarburant}%` }} title={`Carburant ${pctCarburant}%`} />
                                    <div className="bg-orange-400 h-full flex-1" title={`Réparations ${100 - pctCarburant}%`} />
                                  </div>
                                  <div className="flex gap-3 mt-1">
                                    <span className="text-blue-400 text-[10px] flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />
                                      Carb. {pctCarburant}%
                                    </span>
                                    <span className="text-orange-400 text-[10px] flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full inline-block" />
                                      Rép. {100 - pctCarburant}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Totaux */}
                    <tfoot>
                      <tr className="border-t border-slate-600/50 bg-slate-800/40">
                        <td className="px-5 py-3 text-slate-400 text-xs font-semibold uppercase">Total général</td>
                        <td className="px-5 py-3 text-right hidden sm:table-cell">
                          <p className="text-blue-400 font-bold text-sm">
                            {formatCFA(vehicules.reduce((s, v) => s + v.coutCarburant, 0))}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right hidden sm:table-cell">
                          <p className="text-orange-400 font-bold text-sm">
                            {formatCFA(vehicules.reduce((s, v) => s + v.coutReparations, 0))}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right" colSpan={2}>
                          <p className="text-white font-bold">
                            {formatCFA(vehicules.reduce((s, v) => s + v.coutTotal, 0))}
                          </p>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal détail véhicule ── */}
      {detailId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">
                {detailData?.vehicule?.immatriculation || 'Chargement...'}
              </h3>
              <button onClick={() => { setDetailId(null); setDetailData(null) }} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {detailLoading ? (
                <p className="text-center py-8 text-slate-500 text-sm">Chargement...</p>
              ) : detailData ? (
                <>
                  {/* Résumé */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0F172A] rounded-xl border border-slate-700/50 p-3">
                      <p className="text-slate-400 text-xs">Dernier plein</p>
                      <p className="text-white font-bold text-sm mt-0.5">
                        {detailData.resume.joursDepuisDernierPlein !== null
                          ? `Il y a ${detailData.resume.joursDepuisDernierPlein} jour${detailData.resume.joursDepuisDernierPlein > 1 ? 's' : ''}`
                          : 'Aucun'
                        }
                      </p>
                    </div>
                    <div className="bg-[#0F172A] rounded-xl border border-slate-700/50 p-3">
                      <p className="text-slate-400 text-xs">Consommation moyenne/mois</p>
                      <p className="text-orange-400 font-bold text-sm mt-0.5">
                        {detailData.resume.moyenneMensuelleLitres.toFixed(1)} L
                      </p>
                      <p className="text-slate-500 text-xs">
                        {detailData.resume.moyenneMensuelleMontant.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Dernières factures carburant */}
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase mb-2">Derniers rechargements</h4>
                    {detailData.dernieresFactures.length === 0 ? (
                      <p className="text-slate-600 text-sm">Aucun</p>
                    ) : (
                      <div className="space-y-2">
                        {detailData.dernieresFactures.map((f: any) => (
                          <div key={f.id} className="bg-[#0F172A] rounded-xl border border-slate-700/50 p-3 flex items-center justify-between">
                            <div>
                              <p className="text-white text-sm font-medium">{f.numero}</p>
                              <p className="text-slate-500 text-xs">{new Date(f.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-orange-400 font-semibold text-sm">{f.litres.toFixed(1)} L</p>
                              <p className="text-slate-500 text-xs">{f.montant.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dernières réparations */}
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase mb-2">Dernières réparations</h4>
                    {detailData.dernieresReparations.length === 0 ? (
                      <p className="text-slate-600 text-sm">Aucune</p>
                    ) : (
                      <div className="space-y-2">
                        {detailData.dernieresReparations.map((r: any) => (
                          <div key={r.id} className="bg-[#0F172A] rounded-xl border border-slate-700/50 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-white text-sm font-medium">{r.description}</p>
                              <p className="text-orange-400 font-semibold text-sm">{r.cout.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-slate-500 text-xs">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                              {r.mecanicien && <p className="text-slate-500 text-xs">· {r.mecanicien}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-red-400 text-sm">Erreur de chargement</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
