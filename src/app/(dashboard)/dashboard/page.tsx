import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCFA, formatLitres, formatDate } from '@/lib/utils'
import { StatCard } from '@/components/dashboard/StatCard'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalSortiesMois,
    totalSortiesMoisPrecedent,
    totalReparationsMois,
    vehiculesActifs,
    recentSorties,
    monthlyData,
    budget,
    prochainRavitaillementRaw,
  ] = await Promise.all([
    // Total carburant ce mois
    prisma.sortieCarburant.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { coutTotal: true, litres: true },
      _count: true,
    }),
    // Total mois précédent
    prisma.sortieCarburant.aggregate({
      where: { date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { coutTotal: true },
    }),
    // Total réparations ce mois
    prisma.reparation.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { cout: true },
    }),
    // Véhicules actifs
    prisma.vehicule.count({ where: { statut: 'ACTIF' } }),
    // 5 dernières sorties
    prisma.sortieCarburant.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: { vehicule: true, personnel: true },
    }),
    // Données 6 derniers mois
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        return prisma.sortieCarburant.aggregate({
          where: { date: { gte: d, lte: end } },
          _sum: { coutTotal: true, litres: true },
        }).then(res => ({
          mois: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          depenses: res._sum.coutTotal || 0,
          litres: res._sum.litres || 0,
        }))
      })
    ),
    // Budget carte essence
    prisma.budgetCarburant.findFirst(),
    // Prochains ravitaillements
    prisma.vehicule.findMany({
      where: { statut: 'ACTIF' },
      include: {
        sorties: { take: 1, orderBy: { date: 'desc' }, select: { date: true } },
        personnelAssigne: { select: { prenom: true, nom: true } },
      },
    }),
  ])

  const prochainRavitaillement = prochainRavitaillementRaw
    .map(v => {
      const lastSortie = v.sorties[0]
      const daysSince = lastSortie
        ? Math.floor((now.getTime() - new Date(lastSortie.date).getTime()) / (1000 * 60 * 60 * 24))
        : 9999
      const joursRestants = v.periodeCarburation - daysSince
      return { id: v.id, immatriculation: v.immatriculation, marque: v.marque, modele: v.modele, joursRestants, personnelAssigne: v.personnelAssigne }
    })
    .filter(v => v.joursRestants <= 5)
    .sort((a, b) => a.joursRestants - b.joursRestants)
    .slice(0, 6)

  const tendanceMois = totalSortiesMoisPrecedent._sum.coutTotal
    ? Math.round(
        ((totalSortiesMois._sum.coutTotal || 0) - (totalSortiesMoisPrecedent._sum.coutTotal || 0)) /
          (totalSortiesMoisPrecedent._sum.coutTotal || 1) * 100
      )
    : 0

  return {
    totalDepenses: totalSortiesMois._sum.coutTotal || 0,
    totalLitres: totalSortiesMois._sum.litres || 0,
    nombreSorties: totalSortiesMois._count || 0,
    totalReparations: totalReparationsMois._sum.cout || 0,
    vehiculesActifs,
    recentSorties,
    monthlyData: monthlyData.reverse(),
    tendanceMois,
    prochainRavitaillement,
    budget: budget ? {
      solde: budget.solde,
      seuilAlerte: budget.seuilAlerte,
      enAlerte: budget.solde <= budget.seuilAlerte,
    } : null,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Bonjour, {session?.user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Voici le résumé de votre flotte pour ce mois
        </p>
      </div>

      {/* Budget carte essence */}
      {data.budget && (
        <a href="/alertes" className="block">
          <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity hover:opacity-90 ${
            data.budget.enAlerte
              ? 'bg-red-500/10 border-red-500/40'
              : data.budget.solde <= data.budget.seuilAlerte * 2
              ? 'bg-orange-500/10 border-orange-500/30'
              : 'bg-[#1E293B] border-slate-700/50'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                data.budget.enAlerte ? 'bg-red-500/20' : 'bg-green-500/10'
              }`}>
                <svg className={`w-5 h-5 ${data.budget.enAlerte ? 'text-red-400' : 'text-green-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Budget carte essence</p>
                <p className={`text-2xl font-bold mt-0.5 ${
                  data.budget.enAlerte ? 'text-red-400'
                  : data.budget.solde <= data.budget.seuilAlerte * 2 ? 'text-orange-400'
                  : 'text-white'
                }`}>
                  {formatCFA(data.budget.solde)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:text-right">
              <div>
                <p className="text-slate-500 text-xs">Seuil d'alerte</p>
                <p className="text-slate-300 text-sm font-semibold">{formatCFA(data.budget.seuilAlerte)}</p>
              </div>
              {data.budget.enAlerte ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Recharge requise
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Solde OK
                </span>
              )}
            </div>
          </div>
        </a>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Dépenses carburant"
          value={formatCFA(data.totalDepenses)}
          subtitle={`${data.nombreSorties} sorties ce mois`}
          color="blue"
          trend={data.tendanceMois !== 0 ? { value: data.tendanceMois, label: 'vs mois dernier' } : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Litres consommés"
          value={formatLitres(data.totalLitres)}
          subtitle="Ce mois"
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        />
        <StatCard
          title="Véhicules actifs"
          value={String(data.vehiculesActifs)}
          subtitle="Dans la flotte"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l4 4v4a2 2 0 01-2 2h-1m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          }
        />
        <StatCard
          title="Réparations ce mois"
          value={formatCFA(data.totalReparations)}
          subtitle="Coût total"
          color="red"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* Graphiques */}
      <DashboardCharts monthlyData={data.monthlyData} />

      {/* Prochains ravitaillements */}
      {data.prochainRavitaillement.length > 0 && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-700/50">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-white font-semibold text-sm">Prochains ravitaillements</h3>
            </div>
            <a href="/alertes" className="text-blue-400 text-xs hover:text-blue-300">Voir tout →</a>
          </div>
          <div className="divide-y divide-slate-800/60">
            {data.prochainRavitaillement.map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-medium">{v.immatriculation}</p>
                  <p className="text-slate-500 text-xs">{v.marque} {v.modele}{v.personnelAssigne ? ` · ${v.personnelAssigne.prenom} ${v.personnelAssigne.nom}` : ''}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                  v.joursRestants <= 0 ? 'bg-red-500/20 text-red-400' :
                  v.joursRestants === 1 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {v.joursRestants <= 0 ? 'En retard' : v.joursRestants === 1 ? 'Demain' : `J-${v.joursRestants}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières sorties */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#1E293B] rounded-xl border border-slate-700/50">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Dernières sorties carburant</h3>
            <a href="/carburant" className="text-blue-400 text-xs hover:text-blue-300">Voir tout →</a>
          </div>
          <div className="divide-y divide-slate-800/60">
            {data.recentSorties.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Aucune sortie enregistrée</p>
            ) : (
              data.recentSorties.map((sortie) => (
                <div key={sortie.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{sortie.vehicule.immatriculation}</p>
                      <p className="text-slate-500 text-xs">{sortie.personnel.prenom} {sortie.personnel.nom} · {formatDate(sortie.date)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-white text-sm font-semibold">{formatCFA(sortie.coutTotal)}</p>
                    <p className="text-slate-500 text-xs">{formatLitres(sortie.litres)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Réparations ce mois */}
    </div>
  )
}
