import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = (session.user as { role: string }).role
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const vidange = await prisma.vidange.findUnique({
      where: { id: params.id },
      include: { vehicule: true },
    })
    if (!vidange) return NextResponse.json({ error: 'Vidange introuvable' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.vidange.delete({ where: { id: params.id } })
      await tx.suppressionLog.create({
        data: {
          type: 'VIDANGE',
          description: `Vidange ${vidange.vehicule.immatriculation} — ${vidange.vehicule.marque} ${vidange.vehicule.modele} du ${new Date(vidange.date).toLocaleDateString('fr-FR')}`,
          montant: vidange.cout,
          createdById: (session.user as { id: string }).id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/vidanges/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
