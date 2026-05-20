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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: "Réservé à l'admin" }, { status: 403 })
    }

    const oldFacture = await prisma.facture.findUnique({
      where: { id: params.id },
      include: { vehicule: true, lignes: true },
    })
    if (!oldFacture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const { numero, vehiculeId, date, notes, lignes } = await req.json()

    if (!numero?.trim())  return NextResponse.json({ error: 'Le numéro de facture est obligatoire' }, { status: 400 })
    if (!vehiculeId)      return NextResponse.json({ error: 'Le véhicule est obligatoire' }, { status: 400 })
    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'Au moins une ligne est requise' }, { status: 400 })
    }

    for (const l of lignes) {
      if (!l.description?.trim()) return NextResponse.json({ error: 'Chaque ligne doit avoir une description' }, { status: 400 })
      if (!l.montant || parseFloat(l.montant) <= 0) return NextResponse.json({ error: 'Chaque ligne doit avoir un montant positif' }, { status: 400 })
    }

    const nouveauTotal = lignes.reduce((s: number, l: any) => s + parseFloat(l.montant), 0)
    const difference = nouveauTotal - oldFacture.total

    const oldLinesSummary = oldFacture.lignes.map(l => ({
      type: l.type, typeCarburant: l.typeCarburant, description: l.description,
      quantite: l.quantite, prixUnitaire: l.prixUnitaire, montant: l.montant, notes: l.notes,
    }))
    const newLinesSummary = lignes.map((l: any) => ({
      type: l.type || 'AUTRE', typeCarburant: l.type === 'CARBURANT' && l.typeCarburant ? l.typeCarburant : null,
      description: l.description.trim(), quantite: l.quantite ? parseFloat(l.quantite) : null,
      prixUnitaire: l.prixUnitaire ? parseFloat(l.prixUnitaire) : null,
      montant: parseFloat(l.montant), notes: l.notes?.trim() || null,
    }))

    const facture = await prisma.$transaction(async (tx) => {
      await tx.ligneFacture.deleteMany({ where: { factureId: params.id } })

      const f = await tx.facture.update({
        where: { id: params.id },
        data: {
          numero:    numero.trim(),
          vehiculeId,
          date:      date ? new Date(date) : undefined,
          notes:     notes?.trim() ?? null,
          total:     nouveauTotal,
          lignes: { create: newLinesSummary },
        },
        include: {
          vehicule:  { select: { immatriculation: true, marque: true, modele: true } },
          lignes:    true,
          createdBy: { select: { name: true } },
        },
      })

      if (difference !== 0) {
        const ajustement = difference > 0
          ? { decrement: difference }
          : { increment: Math.abs(difference) }
        await tx.budgetCarburant.updateMany({ data: { solde: ajustement } })
      }

      await tx.modificationFactureLog.create({
        data: {
          factureId: params.id,
          createdById: (session.user as { id: string }).id,
          details: JSON.stringify({
            ancienNumero: oldFacture.numero,
            ancienTotal: oldFacture.total,
            anciennesLignes: oldLinesSummary,
            ancienVehiculeId: oldFacture.vehiculeId,
            ancienDate: oldFacture.date.toISOString(),
            ancienNotes: oldFacture.notes,
          }),
        },
      })

      return f
    })

    return NextResponse.json(facture)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ce numéro de facture existe déjà' }, { status: 409 })
    }
    console.error('PUT /api/factures/[id]:', error)
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
