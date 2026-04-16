import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const periode = searchParams.get('periode') || 'mois' // mois | 3mois | 6mois | annee | tout

    // Calcul de la date de début selon la période
    const now = new Date()
    let dateDebut: Date | undefined

    switch (periode) {
      case 'mois':
        dateDebut = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3mois':
        dateDebut = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case '6mois':
        dateDebut = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case 'annee':
        dateDebut = new Date(now.getFullYear(), 0, 1)
        break
      default:
        dateDebut = undefined
    }

    const whereDate = dateDebut ? { date: { gte: dateDebut } } : {}

    // ─── 1. Classement chauffeurs ─────────────────────────────────────────────
    const [classementRaw, personnelList] = await Promise.all([
      prisma.sortieCarburant.groupBy({
        by: ['personnelId'],
        where: whereDate,
        _sum: { litres: true, coutTotal: true },
        _count: { id: true },
        orderBy: { _sum: { litres: 'desc' } },
      }),
      prisma.personnel.findMany({
        select: { id: true, nom: true, prenom: true, role: true },
      }),
    ])

    const personnelMap = Object.fromEntries(personnelList.map(p => [p.id, p]))
    const classementChauffeurs = classementRaw
      .map(c => ({
        personnel: personnelMap[c.personnelId] || { nom: '—', prenom: '', role: '' },
        litres: c._sum.litres || 0,
        coutTotal: c._sum.coutTotal || 0,
        nbSorties: c._count.id || 0,
      }))
      .filter(c => c.personnel.nom !== '—')

    // ─── 2. Coût total par véhicule ───────────────────────────────────────────
    const whereVehiculeDate = dateDebut ? { date: { gte: dateDebut } } : {}

    const [coutCarburantRaw, coutReparationsRaw, vehiculesList] = await Promise.all([
      prisma.sortieCarburant.groupBy({
        by: ['vehiculeId'],
        where: whereVehiculeDate,
        _sum: { litres: true, coutTotal: true },
        _count: { id: true },
      }),
      prisma.reparation.groupBy({
        by: ['vehiculeId'],
        where: whereVehiculeDate,
        _sum: { cout: true },
        _count: { id: true },
      }),
      prisma.vehicule.findMany({
        select: { id: true, immatriculation: true, marque: true, modele: true, type: true },
      }),
    ])

    const vehiculeMap = Object.fromEntries(vehiculesList.map(v => [v.id, v]))
    const coutCarburantMap = Object.fromEntries(
      coutCarburantRaw.map(c => [c.vehiculeId, {
        litres: c._sum.litres || 0,
        coutCarburant: c._sum.coutTotal || 0,
        nbSorties: c._count.id || 0,
      }])
    )
    const coutReparationsMap = Object.fromEntries(
      coutReparationsRaw.map(r => [r.vehiculeId, {
        coutReparations: r._sum.cout || 0,
        nbReparations: r._count.id || 0,
      }])
    )

    // Fusionner tous les véhicules qui ont au moins une activité
    const vehiculeIds = new Set([
      ...Object.keys(coutCarburantMap),
      ...Object.keys(coutReparationsMap),
    ])

    const coutParVehicule = Array.from(vehiculeIds)
      .map(id => {
        const vehicule = vehiculeMap[id]
        if (!vehicule) return null
        const carburant = coutCarburantMap[id] || { litres: 0, coutCarburant: 0, nbSorties: 0 }
        const reparation = coutReparationsMap[id] || { coutReparations: 0, nbReparations: 0 }
        return {
          vehicule,
          litres: carburant.litres,
          coutCarburant: carburant.coutCarburant,
          coutReparations: reparation.coutReparations,
          coutTotal: carburant.coutCarburant + reparation.coutReparations,
          nbSorties: carburant.nbSorties,
          nbReparations: reparation.nbReparations,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.coutTotal - a!.coutTotal))

    return NextResponse.json({
      periode,
      classementChauffeurs,
      coutParVehicule,
    })
  } catch (error) {
    console.error('GET /api/stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
