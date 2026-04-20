import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
