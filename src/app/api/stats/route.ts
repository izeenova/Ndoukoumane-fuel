import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const periode = searchParams.get('periode') || 'mois'

    const now = new Date()
    let dateDebut: Date | undefined
    switch (periode) {
      case 'mois':   dateDebut = new Date(now.getFullYear(), now.getMonth(), 1); break
      case '3mois':  dateDebut = new Date(now.getFullYear(), now.getMonth() - 3, 1); break
      case '6mois':  dateDebut = new Date(now.getFullYear(), now.getMonth() - 6, 1); break
      case 'annee':  dateDebut = new Date(now.getFullYear(), 0, 1); break
      default:       dateDebut = undefined
    }

    // ─── Véhicules + Chauffeurs ──────────────────────────────────────────────
    const vehicules = await prisma.vehicule.findMany({
      select: {
        id: true, immatriculation: true, marque: true, modele: true, type: true,
        personnelAssigne: { select: { id: true, prenom: true, nom: true } },
      },
    })
    const vehiculeMap = Object.fromEntries(vehicules.map(v => [v.id, v]))

    // ─── Carburant via Factures ───────────────────────────────────────────────
    const factureLines = await prisma.ligneFacture.findMany({
      where: {
        type: 'CARBURANT',
        facture: dateDebut ? { date: { gte: dateDebut } } : {},
      },
      include: { facture: { select: { vehiculeId: true } } },
    })

    // Grouper les lignes de carburant par véhicule
    const carburantByVehicule: Record<string, { litres: number; coutCarburant: number; nbSorties: number }> = {}
    for (const l of factureLines) {
      const vid = l.facture.vehiculeId
      if (!carburantByVehicule[vid]) carburantByVehicule[vid] = { litres: 0, coutCarburant: 0, nbSorties: 0 }
      carburantByVehicule[vid].litres += l.quantite || 0
      carburantByVehicule[vid].coutCarburant += l.montant
      carburantByVehicule[vid].nbSorties += 1
    }

    // ─── Réparations ──────────────────────────────────────────────────────────
    const reparationsRaw = await prisma.reparation.groupBy({
      by: ['vehiculeId'],
      where: dateDebut ? { date: { gte: dateDebut } } : {},
      _sum: { cout: true },
      _count: { id: true },
    })
    const reparationsByVehicule: Record<string, { coutReparations: number; nbReparations: number }> = {}
    for (const r of reparationsRaw) {
      reparationsByVehicule[r.vehiculeId] = {
        coutReparations: r._sum.cout || 0,
        nbReparations: r._count.id || 0,
      }
    }

    // ─── Fusion véhicules ─────────────────────────────────────────────────────
    const vehiculeIds = new Set([...Object.keys(carburantByVehicule), ...Object.keys(reparationsByVehicule)])
    const coutParVehicule = Array.from(vehiculeIds)
      .map(id => {
        const v = vehiculeMap[id]
        if (!v) return null
        const carb = carburantByVehicule[id] || { litres: 0, coutCarburant: 0, nbSorties: 0 }
        const rep = reparationsByVehicule[id] || { coutReparations: 0, nbReparations: 0 }
        return {
          vehicule: { ...v, chauffeur: v.personnelAssigne ? `${v.personnelAssigne.prenom} ${v.personnelAssigne.nom}` : null },
          litres: carb.litres,
          coutCarburant: carb.coutCarburant,
          coutReparations: rep.coutReparations,
          coutTotal: carb.coutCarburant + rep.coutReparations,
          nbSorties: carb.nbSorties,
          nbReparations: rep.nbReparations,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.coutTotal - a!.coutTotal)

    // ─── Classement chauffeurs (depuis les factures) ──────────────────────────
    const chauffeurMap: Record<string, { litres: number; coutTotal: number; nbSorties: number }> = {}
    for (const l of factureLines) {
      const v = vehiculeMap[l.facture.vehiculeId]
      if (!v?.personnelAssigne) continue
      const pid = v.personnelAssigne.id
      if (!chauffeurMap[pid]) chauffeurMap[pid] = { litres: 0, coutTotal: 0, nbSorties: 0 }
      chauffeurMap[pid].litres += l.quantite || 0
      chauffeurMap[pid].coutTotal += l.montant
      chauffeurMap[pid].nbSorties += 1
    }

    const classementChauffeurs = Object.entries(chauffeurMap)
      .map(([pid, data]) => {
        const p = vehicules.map(v => v.personnelAssigne).find(pa => pa?.id === pid)
        return {
          personnel: { nom: p?.nom || '—', prenom: p?.prenom || '', role: 'CHAUFFEUR' },
          litres: data.litres,
          coutTotal: data.coutTotal,
          nbSorties: data.nbSorties,
        }
      })
      .filter(c => c.personnel.nom !== '—')
      .sort((a, b) => b.litres - a.litres)

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
