import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const periode = searchParams.get('periode') || 'mois' // jour | semaine | mois

    const now = new Date()
    let dateDebut: Date
    let labelPeriode: string

    switch (periode) {
      case 'jour':
        dateDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        labelPeriode = `Journalier_${now.toLocaleDateString('fr-FR').replace(/\//g, '-')}`
        break
      case 'semaine': {
        const day = now.getDay() || 7
        dateDebut = new Date(now)
        dateDebut.setDate(now.getDate() - day + 1)
        dateDebut.setHours(0, 0, 0, 0)
        labelPeriode = `Semaine_${dateDebut.toLocaleDateString('fr-FR').replace(/\//g, '-')}`
        break
      }
      default:
        dateDebut = new Date(now.getFullYear(), now.getMonth(), 1)
        labelPeriode = `Mensuel_${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }).replace(/ /g, '_')}`
    }

    const sorties = await prisma.sortieCarburant.findMany({
      where: { date: { gte: dateDebut } },
      include: {
        vehicule:  { select: { immatriculation: true, marque: true, modele: true, type: true } },
        personnel: { select: { prenom: true, nom: true } },
      },
      orderBy: { date: 'desc' },
    })

    // Construire les données Excel
    const rows = sorties.map(s => ({
      'Date': new Date(s.date).toLocaleString('fr-FR'),
      'Plaque': s.vehicule.immatriculation,
      'Marque': s.vehicule.marque,
      'Modèle': s.vehicule.modele,
      'Type': s.vehicule.type === 'CAMION' ? 'Camion' : 'Voiture',
      'Employé': `${s.personnel.prenom} ${s.personnel.nom}`,
      'Litres': s.litres,
      'Prix/L (FCFA)': s.prixLitre,
      'Coût Total (FCFA)': s.coutTotal,
      'Notes': s.notes || '',
    }))

    // Totaux
    const totalLitres = sorties.reduce((sum, s) => sum + s.litres, 0)
    const totalCout = sorties.reduce((sum, s) => sum + s.coutTotal, 0)
    rows.push({
      'Date': '',
      'Plaque': '',
      'Marque': '',
      'Modèle': '',
      'Type': '',
      'Employé': 'TOTAL',
      'Litres': totalLitres,
      'Prix/L (FCFA)': 0,
      'Coût Total (FCFA)': totalCout,
      'Notes': `${sorties.length} sortie(s)`,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    // Largeurs colonnes
    ws['!cols'] = [
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sorties Carburant')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="NDOUKOUMANE_Carburant_${labelPeriode}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('GET /api/export/carburant:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
