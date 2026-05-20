import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const vehicule = await prisma.vehicule.findUnique({
      where: { id: params.id },
      include: { personnelAssigne: { select: { prenom: true, nom: true } } },
    })
    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })

    // Dernières factures carburant
    const facturesCarburant = await prisma.facture.findMany({
      where: {
        vehiculeId: params.id,
        lignes: { some: { type: 'CARBURANT' } },
      },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        lignes: { where: { type: 'CARBURANT' } },
        createdBy: { select: { name: true } },
      },
    })

    // Dernières réparations
    const reparations = await prisma.reparation.findMany({
      where: { vehiculeId: params.id },
      orderBy: { date: 'desc' },
      take: 5,
      include: { personnel: { select: { prenom: true, nom: true } } },
    })

    // Consommation moyenne mensuelle (sur les 3 derniers mois)
    const troisMoisAgo = new Date()
    troisMoisAgo.setMonth(troisMoisAgo.getMonth() - 3)
    const lignes3Mois = await prisma.ligneFacture.findMany({
      where: {
        type: 'CARBURANT',
        facture: { vehiculeId: params.id, date: { gte: troisMoisAgo } },
      },
    })
    const totalLitres3Mois = lignes3Mois.reduce((s, l) => s + (l.quantite || 0), 0)
    const totalMontant3Mois = lignes3Mois.reduce((s, l) => s + l.montant, 0)
    const moyenneMensuelleLitres = totalLitres3Mois / 3
    const moyenneMensuelleMontant = totalMontant3Mois / 3

    // Dernière date de recharge
    const derniereFacture = facturesCarburant.length > 0 ? facturesCarburant[0] : null
    const joursDepuisDernierPlein = derniereFacture
      ? Math.floor((Date.now() - new Date(derniereFacture.date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      vehicule: {
        id: vehicule.id,
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        chauffeur: vehicule.personnelAssigne
          ? `${vehicule.personnelAssigne.prenom} ${vehicule.personnelAssigne.nom}`
          : null,
      },
      resume: {
        joursDepuisDernierPlein,
        totalLitres3Mois,
        totalMontant3Mois,
        moyenneMensuelleLitres: Math.round(moyenneMensuelleLitres * 100) / 100,
        moyenneMensuelleMontant: Math.round(moyenneMensuelleMontant),
      },
      dernieresFactures: facturesCarburant.map(f => ({
        id: f.id,
        numero: f.numero,
        date: f.date.toISOString(),
        litres: f.lignes.reduce((s, l) => s + (l.quantite || 0), 0),
        montant: f.lignes.reduce((s, l) => s + l.montant, 0),
        notes: f.notes,
      })),
      dernieresReparations: reparations.map(r => ({
        id: r.id,
        description: r.description,
        cout: r.cout,
        date: r.date.toISOString(),
        mecanicien: r.personnel ? `${r.personnel.prenom} ${r.personnel.nom}` : null,
      })),
    })
  } catch (error) {
    console.error('GET /api/vehicules/[id]/stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
