import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed...')

  // ─── Utilisateurs système ────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@2025', 12)
  const fuelPassword = await bcrypt.hash('Fuel@2025', 12)
  const repairPassword = await bcrypt.hash('Repair@2025', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ndoukouman.com' },
    update: {},
    create: {
      email: 'admin@ndoukouman.com',
      name: 'Responsable Principal',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  const gestCarburant = await prisma.user.upsert({
    where: { email: 'carburant@ndoukouman.com' },
    update: {},
    create: {
      email: 'carburant@ndoukouman.com',
      name: 'Gestionnaire Carburant',
      password: fuelPassword,
      role: 'CARBURANT',
    },
  })

  const gestReparation = await prisma.user.upsert({
    where: { email: 'reparation@ndoukouman.com' },
    update: {},
    create: {
      email: 'reparation@ndoukouman.com',
      name: 'Gestionnaire Réparations',
      password: repairPassword,
      role: 'REPARATION',
    },
  })

  console.log('✅ Utilisateurs créés:')
  console.log('   Admin:', admin.email, '/ mot de passe: Admin@2025')
  console.log('   Carburant:', gestCarburant.email, '/ mot de passe: Fuel@2025')
  console.log('   Réparation:', gestReparation.email, '/ mot de passe: Repair@2025')

  // ─── Véhicules de démonstration ───────────────────────────────────────────
  const camion1 = await prisma.vehicule.upsert({
    where: { immatriculation: 'DK-1234-AB' },
    update: {},
    create: {
      immatriculation: 'DK-1234-AB',
      type: 'CAMION',
      marque: 'Mercedes',
      modele: 'Actros 1845',
      annee: 2020,
      capaciteReservoir: 600,
      niveauActuel: 120,
      statut: 'ACTIF',
    },
  })

  const voiture1 = await prisma.vehicule.upsert({
    where: { immatriculation: 'DK-5678-CD' },
    update: {},
    create: {
      immatriculation: 'DK-5678-CD',
      type: 'VOITURE',
      marque: 'Toyota',
      modele: 'Hilux',
      annee: 2022,
      capaciteReservoir: 80,
      niveauActuel: 65,
      statut: 'ACTIF',
    },
  })

  // ─── Alertes par défaut ───────────────────────────────────────────────────
  await prisma.alerteCarburant.upsert({
    where: { vehiculeId: camion1.id },
    update: {},
    create: {
      vehiculeId: camion1.id,
      seuil: 20,
      actif: true,
    },
  })

  await prisma.alerteCarburant.upsert({
    where: { vehiculeId: voiture1.id },
    update: {},
    create: {
      vehiculeId: voiture1.id,
      seuil: 25,
      actif: true,
    },
  })

  // ─── Personnel de démonstration ───────────────────────────────────────────
  await prisma.personnel.upsert({
    where: { matricule: 'CHF-001' },
    update: {},
    create: {
      nom: 'Diallo',
      prenom: 'Mamadou',
      role: 'CHAUFFEUR',
      telephone: '+221 77 123 45 67',
      matricule: 'CHF-001',
    },
  })

  await prisma.personnel.upsert({
    where: { matricule: 'MEC-001' },
    update: {},
    create: {
      nom: 'Ndiaye',
      prenom: 'Ibrahima',
      role: 'MECANO',
      telephone: '+221 76 987 65 43',
      matricule: 'MEC-001',
    },
  })

  console.log('✅ Données de démonstration créées')
  console.log('')
  console.log('🚀 Base de données prête!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
