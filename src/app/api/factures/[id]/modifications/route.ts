import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: "Réservé à l'admin" }, { status: 403 })
    }

    const facture = await prisma.facture.findUnique({ where: { id: params.id } })
    if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const modifications = await prisma.modificationFactureLog.findMany({
      where: { factureId: params.id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    })

    return NextResponse.json(modifications)
  } catch (error) {
    console.error('GET /api/factures/[id]/modifications:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
