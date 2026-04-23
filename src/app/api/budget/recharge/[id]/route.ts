import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE — supprimer une recharge et décrémenter le solde (admin uniquement)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé à l\'admin' }, { status: 403 })
    }

    const recharge = await prisma.rechargeBudget.findUnique({ where: { id: params.id } })
    if (!recharge) return NextResponse.json({ error: 'Recharge introuvable' }, { status: 404 })

    const budget = await prisma.budgetCarburant.findUnique({ where: { id: recharge.budgetId } })
    if (!budget) return NextResponse.json({ error: 'Budget introuvable' }, { status: 404 })

    await prisma.$transaction([
      prisma.rechargeBudget.delete({ where: { id: params.id } }),
      prisma.budgetCarburant.update({
        where: { id: budget.id },
        data: { solde: { decrement: recharge.montant } },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/budget/recharge/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
