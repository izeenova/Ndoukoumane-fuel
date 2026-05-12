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

    // On récupère TOUTES les transactions sans filtre date
    // pour calculer un solde cumulatif correct même avec un filtre d'affichage
    const [recharges, sorties, vidanges, factures] = await Promise.all([
      prisma.rechargeBudget.findMany({
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.sortieCarburant.findMany({
        include: {
          vehicule: { select: { immatriculation: true, marque: true, modele: true } },
          personnel: { select: { prenom: true, nom: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.vidange.findMany({
        include: {
          vehicule: { select: { immatriculation: true, marque: true, modele: true } },
        },
        orderBy: { date: 'asc' },
      }),
      // Inclure les factures si le modèle existe
      (prisma as any).facture?.findMany({
        include: {
          vehicule: { select: { immatriculation: true, marque: true, modele: true } },
          lignes:   true,
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }).catch(() => []) ?? Promise.resolve([]),
    ])

    // Fusionner toutes les transactions dans un tableau unifié
    const transactions: {
      id: string
      type: 'RECHARGE' | 'CARBURANT' | 'VIDANGE' | 'FACTURE'
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

    for (const f of (factures as any[])) {
      transactions.push({
        id: f.id,
        type: 'FACTURE',
        date: f.date,
        montant: -f.total,
        description: `Facture ${f.numero} — ${f.vehicule.immatriculation} ${f.vehicule.marque} ${f.vehicule.modele}`,
        createdBy: f.createdBy?.name,
      })
    }

    // Trier par date croissante pour calculer le solde cumulatif dans le bon ordre
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculer le solde cumulatif sur TOUTES les transactions (sans filtre)
    let solde = 0
    const withSolde = transactions.map(t => {
      const soldePrecedent = solde
      solde += t.montant
      return { ...t, soldePrecedent, soldeCumul: solde }
    })

    // Appliquer le filtre de date uniquement pour l'affichage
    const startDate = dateDebut ? new Date(dateDebut)                    : null
    const endDate   = dateFin   ? new Date(dateFin + 'T23:59:59')        : null

    const filtered = withSolde.filter(t => {
      if (startDate && t.date < startDate) return false
      if (endDate   && t.date > endDate)   return false
      return true
    })

    // Retourner en ordre décroissant (plus récent en premier)
    filtered.reverse()

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('GET /api/budget/historique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
