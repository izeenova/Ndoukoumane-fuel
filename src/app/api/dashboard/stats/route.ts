import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalVehicules, totalPersonnel, sortiesMois, reparationsMois] = await Promise.all([
      prisma.vehicule.count(),
      prisma.personnel.count({ where: { actif: true } }),
      prisma.sortieCarburant.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { coutTotal: true, litres: true },
        _count: true,
      }),
      prisma.reparation.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { cout: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      totalVehicules,
      totalPersonnel,
      sortiesMois: {
        count: sortiesMois._count,
        depenses: sortiesMois._sum.coutTotal || 0,
        litres: sortiesMois._sum.litres || 0,
      },
      reparationsMois: {
        count: reparationsMois._count,
        cout: reparationsMois._sum.cout || 0,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
