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

    // Récupérer la sortie pour remettre le carburant dans le véhicule
    const sortie = await prisma.sortieCarburant.findUnique({ where: { id: params.id } })
    if (!sortie) return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 })

    await prisma.$transaction([
      prisma.sortieCarburant.delete({ where: { id: params.id } }),
      prisma.vehicule.update({
        where: { id: sortie.vehiculeId },
        data: {
          niveauActuel: { increment: sortie.litres },
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
