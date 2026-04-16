'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCFA, formatLitres, getRolePersonnelLabel, getTypeVehiculeLabel } from '@/lib/utils'

type Periode = 'mois' | '3mois' | '6mois' | 'annee' | 'tout'

interface ChauffeurStat {
  personnel: { nom: string; prenom: string; role: string }
  litres: number
  coutTotal: number
  nbSorties: number
}

interface VehiculeStat {
  vehicule: { id: string; immatriculation: string; marque: string; modele: string; type: string }
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

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/stats?periode=${periode}`)
    const data = await res.json()
    setClassement(data.classementChauffeurs || [])
    setVehicules(data.coutParVehicule || [])
    setLoading(false)
  }, [periode])

  useEffect(() => { fetchStats() }, [fetchStats])

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
      ) : (
        <div className="space-y-6">
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

            {classement.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">Aucune sortie carburant sur cette période</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {classement.map((c, i) => {
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
                          <tr key={v.vehicule.id} className="hover:bg-slate-800/30 transition-colors">
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
                                  <p className="text-slate-500 text-xs">{v.vehicule.marque} {v.vehicule.modele} · {getTypeVehiculeLabel(v.vehicule.type)}</p>
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
    </div>
  )
}
