import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — solde actuel + historique des recharges
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    let budget = await prisma.budgetCarburant.findFirst({
      include: {
        recharges: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    // Créer le budget si inexistant
    if (!budget) {
      budget = await prisma.budgetCarburant.create({
        data: { solde: 500000, seuilAlerte: 50000 },
        include: { recharges: true },
      }) as any
    }

    return NextResponse.json({
      ...budget,
      enAlerte: budget!.solde <= budget!.seuilAlerte,
    })
  } catch (error) {
    console.error('GET /api/budget:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — recharger le budget (admin uniquement)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé à l\'admin' }, { status: 403 })
    }

    const { montant, note } = await req.json()
    if (!montant || isNaN(parseFloat(montant)) || parseFloat(montant) <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const montantNum = parseFloat(montant)

    // Récupérer ou créer le budget
    let budget = await prisma.budgetCarburant.findFirst()
    if (!budget) {
      budget = await prisma.budgetCarburant.create({ data: { solde: 0, seuilAlerte: 50000 } })
    }

    // Transaction : créer la recharge + incrémenter le solde
    await prisma.$transaction([
      prisma.rechargeBudget.create({
        data: {
          montant: montantNum,
          note: note?.trim() || null,
          budgetId: budget.id,
          createdById: (session.user as { id: string }).id,
        },
      }),
      prisma.budgetCarburant.update({
        where: { id: budget.id },
        data: { solde: { increment: montantNum } },
      }),
    ])

    const updated = await prisma.budgetCarburant.findUnique({ where: { id: budget.id } })
    return NextResponse.json({ solde: updated!.solde, enAlerte: updated!.solde <= updated!.seuilAlerte }, { status: 201 })
  } catch (error) {
    console.error('POST /api/budget:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — réinitialiser le solde à 0 (admin uniquement)
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé à l\'admin' }, { status: 403 })
    }

    const budget = await prisma.budgetCarburant.findFirst()
    if (!budget) return NextResponse.json({ error: 'Budget introuvable' }, { status: 404 })

    const updated = await prisma.budgetCarburant.update({
      where: { id: budget.id },
      data: { solde: 0 },
    })

    return NextResponse.json({ solde: updated.solde, enAlerte: updated.solde <= updated.seuilAlerte })
  } catch (error) {
    console.error('PATCH /api/budget:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — modifier le seuil d'alerte (admin uniquement)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé à l\'admin' }, { status: 403 })
    }

    const { seuilAlerte } = await req.json()
    if (seuilAlerte === undefined || isNaN(parseFloat(seuilAlerte))) {
      return NextResponse.json({ error: 'Seuil invalide' }, { status: 400 })
    }

    const budget = await prisma.budgetCarburant.findFirst()
    if (!budget) return NextResponse.json({ error: 'Budget introuvable' }, { status: 404 })

    const updated = await prisma.budgetCarburant.update({
      where: { id: budget.id },
      data: { seuilAlerte: parseFloat(seuilAlerte) },
    })

    return NextResponse.json({ seuilAlerte: updated.seuilAlerte })
  } catch (error) {
    console.error('PUT /api/budget:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
