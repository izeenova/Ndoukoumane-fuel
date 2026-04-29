import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const dateDebut = searchParams.get('dateDebut') || ''
    const dateFin   = searchParams.get('dateFin')   || ''

    const dateFilter: any = {}
    if (dateDebut) dateFilter.gte = new Date(dateDebut)
    if (dateFin)   dateFilter.lte = new Date(dateFin + 'T23:59:59')

    // Récupérer les 3 types de transactions en parallèle
    const [recharges, sorties, vidanges] = await Promise.all([
      prisma.rechargeBudget.findMany({
        where: dateDebut || dateFin ? { createdAt: dateFilter } : {},
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.sortieCarburant.findMany({
        where: dateDebut || dateFin ? { date: dateFilter } : {},
        include: {
          vehicule: { select: { immatriculation: true, marque: true, modele: true } },
          personnel: { select: { prenom: true, nom: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.vidange.findMany({
        where: dateDebut || dateFin ? { date: dateFilter } : {},
        include: {
          vehicule: { select: { immatriculation: true, marque: true, modele: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ])

    // Fusionner toutes les transactions dans un tableau unifié
    const transactions: {
      id: string
      type: 'RECHARGE' | 'CARBURANT' | 'VIDANGE'
      date: Date
      montant: number   // positif = entrée, négatif = sortie
      description: string
      createdBy?: string
    }[] = []

    for (const r of recharges) {
      transactions.push({
        id: r.id,
        type: 'RECHARGE',
        date: r.createdAt,
        montant: r.montant,
        description: r.note ? `Recharge — ${r.note}` : 'Recharge carte essence',
        createdBy: r.createdBy.name,
      })
    }

    for (const s of sorties) {
      transactions.push({
        id: s.id,
        type: 'CARBURANT',
        date: s.date,
        montant: -s.coutTotal,
        description: `Carburant — ${s.vehicule.immatriculation} ${s.vehicule.marque} ${s.vehicule.modele}${s.personnel ? ` (${s.personnel.prenom} ${s.personnel.nom})` : ''}`,
      })
    }

    for (const v of vidanges) {
      transactions.push({
        id: v.id,
        type: 'VIDANGE',
        date: v.date,
        montant: -v.cout,
        description: `Vidange — ${v.vehicule.immatriculation} ${v.vehicule.marque} ${v.vehicule.modele}`,
      })
    }

    // Trier par date croissante pour calculer le solde courant
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculer le solde cumulatif
    let solde = 0
    const withSolde = transactions.map(t => {
      solde += t.montant
      return { ...t, soldeCumul: solde }
    })

    // Retourner en ordre décroissant (plus récent en premier)
    withSolde.reverse()

    return NextResponse.json(withSolde)
  } catch (error) {
    console.error('GET /api/budget/historique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
