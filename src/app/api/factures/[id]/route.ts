import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const facture = await prisma.facture.findUnique({
      where: { id: params.id },
      include: {
        vehicule:  { select: { immatriculation: true, marque: true, modele: true, personnelAssigne: { select: { prenom: true, nom: true } } } },
        lignes:    true,
        createdBy: { select: { name: true } },
      },
    })
    if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    return NextResponse.json(facture)
  } catch (error) {
    console.error('GET /api/factures/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé à l\'admin' }, { status: 403 })
    }

    const facture = await prisma.facture.findUnique({
      where: { id: params.id },
      include: { vehicule: true, lignes: true },
    })
    if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Les lignes sont supprimées en cascade (onDelete: Cascade)
      await tx.facture.delete({ where: { id: params.id } })

      // Rembourser le total sur le budget carte essence
      await tx.budgetCarburant.updateMany({
        data: { solde: { increment: facture.total } },
      })

      // Journal de suppression
      await tx.suppressionLog.create({
        data: {
          type: 'FACTURE',
          description: `Facture ${facture.numero} — ${facture.vehicule.immatriculation} ${facture.vehicule.marque} ${facture.vehicule.modele} (${facture.lignes.length} ligne${facture.lignes.length > 1 ? 's' : ''})`,
          montant: facture.total,
          createdById: (session.user as { id: string }).id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/factures/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
