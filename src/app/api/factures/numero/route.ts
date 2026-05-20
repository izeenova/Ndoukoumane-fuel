import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — retourne le prochain numéro de facture auto-généré
// Format : YYYYMMDD-XX  ex: 20260512-01, 20260512-02…
// Accepte ?date=YYYY-MM-DD pour générer selon la date de la facture
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')

    const ref = dateParam ? new Date(dateParam) : new Date()
    const yy  = ref.getFullYear()
    const mm  = String(ref.getMonth() + 1).padStart(2, '0')
    const dd  = String(ref.getDate()).padStart(2, '0')
    const prefix = `${yy}${mm}${dd}-`

    // Chercher les factures dont le numéro commence par ce préfixe
    const existing = await prisma.facture.findMany({
      where: { numero: { startsWith: prefix } },
      select: { numero: true },
    })

    // Trouver le plus grand numéro de séquence
    let maxSeq = 0
    for (const f of existing) {
      const seqStr = f.numero.slice(prefix.length)
      const seq = parseInt(seqStr, 10)
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
    }

    const numero = `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
    return NextResponse.json({ numero })
  } catch (error) {
    console.error('GET /api/factures/numero:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
