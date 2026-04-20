import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = (session.user as { role: string }).role
    if (!['ADMIN', 'REPARATION'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { description, cout, date, pieces, notes, vehiculeStatut } = body

    const reparation = await prisma.reparation.update({
      where: { id: params.id },
      data: {
        description: description?.trim(),
        cout: parseFloat(cout),
        date: date ? new Date(date) : undefined,
        pieces: pieces?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { vehicule: true, personnel: true },
    })

    if (vehiculeStatut) {
      await prisma.vehicule.update({
        where: { id: reparation.vehiculeId },
        data: { statut: vehiculeStatut },
      })
    }

    return NextResponse.json(reparation)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const reparation = await prisma.reparation.findUnique({
      where: { id: params.id },
      include: { vehicule: true, personnel: true },
    })
    if (!reparation) return NextResponse.json({ error: 'Réparation introuvable' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.reparation.delete({ where: { id: params.id } })

      await tx.suppressionLog.create({
        data: {
          type: 'REPARATION',
          description: `${reparation.vehicule.immatriculation} — ${reparation.description}${reparation.personnel ? ` — ${reparation.personnel.prenom} ${reparation.personnel.nom}` : ''}`,
          montant: reparation.cout,
          createdById: (session.user as { id: string }).id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/reparations/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
