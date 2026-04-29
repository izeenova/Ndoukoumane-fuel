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

    const { cout, date, notes } = await req.json()
    if (!cout) return NextResponse.json({ error: 'Le coût est obligatoire' }, { status: 400 })

    const ancienne = await prisma.vidange.findUnique({ where: { id: params.id } })
    if (!ancienne) return NextResponse.json({ error: 'Vidange introuvable' }, { status: 404 })

    const nouveauCout = parseFloat(cout)
    const diff        = nouveauCout - ancienne.cout

    const vidange = await prisma.$transaction(async (tx) => {
      const v = await tx.vidange.update({
        where: { id: params.id },
        data: {
          cout:  nouveauCout,
          date:  date ? new Date(date) : ancienne.date,
          notes: notes?.trim() || null,
        },
        include: { vehicule: true, createdBy: { select: { name: true } } },
      })
      await tx.budgetCarburant.updateMany({
        data: { solde: { decrement: diff } },
      })
      return v
    })

    return NextResponse.json(vidange)
  } catch (error) {
    console.error('PUT /api/vidanges/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

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

      // Rembourser le budget carte essence
      await tx.budgetCarburant.updateMany({
        data: { solde: { increment: vidange.cout } },
      })

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
