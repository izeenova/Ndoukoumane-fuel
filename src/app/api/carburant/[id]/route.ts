import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { litres, prixLitre, date, notes } = await req.json()
    if (!litres || !prixLitre) return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })

    const ancienne = await prisma.sortieCarburant.findUnique({ where: { id: params.id } })
    if (!ancienne) return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 })

    const litresNum    = parseFloat(litres)
    const prixLitreNum = parseFloat(prixLitre)
    const nouveauCout  = litresNum * prixLitreNum
    const diff         = nouveauCout - ancienne.coutTotal // positif = plus cher, négatif = remboursement

    const sortie = await prisma.$transaction(async (tx) => {
      const s = await tx.sortieCarburant.update({
        where: { id: params.id },
        data: {
          litres:    litresNum,
          prixLitre: prixLitreNum,
          coutTotal: nouveauCout,
          date:      date ? new Date(date) : ancienne.date,
          notes:     notes?.trim() || null,
        },
        include: { vehicule: true, personnel: true },
      })
      // Ajuster le budget : on débite/rembourse la différence
      await tx.budgetCarburant.updateMany({
        data: { solde: { decrement: diff } },
      })
      return s
    })

    return NextResponse.json(sortie)
  } catch (error) {
    console.error('PUT /api/carburant/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — seul l\'admin peut supprimer' }, { status: 403 })
    }

    const sortie = await prisma.sortieCarburant.findUnique({
      where: { id: params.id },
      include: { vehicule: true, personnel: true },
    })
    if (!sortie) return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 })

    const budget = await prisma.budgetCarburant.findFirst()

    await prisma.$transaction(async (tx) => {
      await tx.sortieCarburant.delete({ where: { id: params.id } })

      if (budget) {
        await tx.budgetCarburant.update({
          where: { id: budget.id },
          data: { solde: { increment: sortie.coutTotal } },
        })
      }

      await tx.suppressionLog.create({
        data: {
          type: 'SORTIE_CARBURANT',
          description: `${sortie.vehicule.immatriculation} — ${sortie.litres}L — ${sortie.coutTotal} FCFA — ${sortie.personnel.prenom} ${sortie.personnel.nom}`,
          montant: sortie.coutTotal,
          createdById: (session.user as { id: string }).id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/carburant/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
