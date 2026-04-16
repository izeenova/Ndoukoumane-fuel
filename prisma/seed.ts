import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Données flotte ──────────────────────────────────────────────────────────

const VEHICULES = [
  { immatriculation: 'AA835CM', marque: 'Peugeot',    modele: '207',           annee: 2019, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA081DF', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA735ME', marque: 'Hyundai',     modele: 'Tucson',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA819KP', marque: 'Toyota',      modele: 'Avensis',       annee: 2005, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA649CZ', marque: 'Mazda',       modele: 'Mazda 3',       annee: 2017, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA523ES', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA419AJ', marque: 'Hyundai',     modele: 'Santa Fe',      annee: 2014, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA292KE', marque: 'Nissan',      modele: 'Rogue',         annee: 2015, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA445EA', marque: 'Hyundai',     modele: 'Santa Fe',      annee: 2015, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA849FE', marque: 'Kia',         modele: 'Forte',         annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA513DF', marque: 'Toyota',      modele: 'RAV4',          annee: null, type: 'VOITURE', statut: 'HORS_SERVICE', notes: 'En Stand By' },
  { immatriculation: 'DK0692BL',marque: 'Infiniti',    modele: 'QX80',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA284DN', marque: 'Ford',        modele: 'Edge',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA434CW', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA514CA', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA318EM', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA910FD', marque: 'Toyota',      modele: 'Camry',         annee: 2011, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA689BL', marque: 'Toyota',      modele: 'Highlander',    annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA500FE', marque: 'Toyota',      modele: 'Land Cruiser',  annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA521DS', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA855ED', marque: 'Volkswagen',  modele: 'Tiguan',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA777EH', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA741MK', marque: 'Range Rover', modele: 'Sport',         annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA482CF', marque: 'Ford',        modele: 'Edge',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK1384BK',marque: 'Peugeot',    modele: '3008',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA101DQ', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA920DQ', marque: 'Peugeot',     modele: '5008',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK8728AY',marque: 'Chevrolet',  modele: 'Equinox',       annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA762CP', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK5007BM',marque: 'Chevrolet',  modele: 'Malibu',        annee: 2011, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK4887BM',marque: 'Hyundai',    modele: 'Sonata',        annee: 2012, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA095AL', marque: 'Toyota',      modele: 'Hilux DC',      annee: 2019, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA716DE', marque: 'Mazda',       modele: 'Mazda 3',       annee: 2017, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA987MT', marque: 'Mercedes',    modele: 'GLE 350',       annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK2561BE',marque: 'Citroen',    modele: 'C4',            annee: 2009, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK2703BH',marque: 'Nissan',     modele: 'Rogue',         annee: 2012, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK3494BD',marque: 'Mazda',      modele: 'Tribute',       annee: 2011, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA357BR', marque: 'Peugeot',     modele: '207',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA858RZ', marque: 'Kia',         modele: 'Sportage',      annee: 2016, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA145FB', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA689SS', marque: 'Toyota',      modele: 'RAV4',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AB026FJ', marque: 'Peugeot',     modele: '307',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA589MR', marque: 'Toyota',      modele: 'VXS',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA380VH', marque: 'Toyota',      modele: 'Land Cruiser',  annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA808AR', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA868HD', marque: 'Ford',        modele: 'Edge',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA667ED', marque: 'Toyota',      modele: 'RAV4',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA664AG', marque: 'Ford',        modele: 'Escape',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA894FL', marque: 'Ford',        modele: 'Explorer',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA212JT', marque: 'Ford',        modele: 'Edge',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA196TA', marque: 'Peugeot',     modele: '406',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA691RW', marque: 'Hyundai',     modele: 'Tucson',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA488YM', marque: 'Ford',        modele: 'Taurus',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA026FY', marque: 'BMW',         modele: 'X7',            annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA058VP', marque: 'Hyundai',     modele: 'Tucson',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA236VH', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA876TP', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA571VL', marque: 'Toyota',      modele: 'RAV4',          annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA412LX', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA662NF', marque: 'Peugeot',     modele: '307',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK3834BH',marque: 'Nissan',     modele: 'Rogue',         annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA998SX', marque: 'Hyundai',     modele: 'Santa Fe',      annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AB999FK', marque: 'Renault',     modele: 'QM6',           annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA270LY', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA240TM', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA758AK', marque: 'Toyota',      modele: 'Hilux',         annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA937PR', marque: 'Toyota',      modele: 'Hilux',         annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA958PR', marque: 'Toyota',      modele: 'Hilux',         annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA130MJ', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA876MK', marque: 'Toyota',      modele: 'Hilux',         annee: null, type: 'CAMION',  statut: 'HORS_SERVICE', notes: 'En Panne' },
  { immatriculation: 'AA348EM', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA102MK', marque: 'Toyota',      modele: 'Hilux',         annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA347EM', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'AA307RP', marque: 'Mitsubishi',  modele: 'L200',          annee: null, type: 'CAMION',  statut: 'ACTIF',        notes: null },
  { immatriculation: 'DK4630BF',marque: 'Citroen',    modele: 'C4',            annee: null, type: 'VOITURE', statut: 'HORS_SERVICE', notes: 'Ancien modèle - Pas assuré' },
  { immatriculation: 'AA535TZ', marque: 'Hyundai',     modele: 'Tucson',        annee: null, type: 'VOITURE', statut: 'ACTIF',        notes: null },
] as const

// ─── Chauffeurs ──────────────────────────────────────────────────────────────

const CHAUFFEURS: { prenom: string; nom: string; matricule: string }[] = [
  { prenom: 'Khadim',               nom: 'Ndiaye',        matricule: 'CHF-001' },
  { prenom: 'Père',                  nom: 'Bary',          matricule: 'CHF-002' },
  { prenom: 'Dienaba',              nom: 'Hane',           matricule: 'CHF-003' },
  { prenom: 'Alioune Badara',       nom: 'Ndao',           matricule: 'CHF-004' },
  { prenom: 'Magatte',              nom: 'Samb',           matricule: 'CHF-005' },
  { prenom: 'Matar',                nom: 'Drame',          matricule: 'CHF-006' },
  { prenom: 'Awa',                  nom: 'Camara',         matricule: 'CHF-007' },
  { prenom: 'Pape Demba',           nom: 'Ndao',           matricule: 'CHF-008' },
  { prenom: 'Mansour',              nom: 'Ndao',           matricule: 'CHF-009' },
  { prenom: 'Cheikh Mbacke',        nom: 'Diop',           matricule: 'CHF-010' },
  { prenom: 'Dame',                 nom: 'Thialaw',        matricule: 'CHF-011' },
  { prenom: 'Modou',                nom: 'Ndao',           matricule: 'CHF-012' },
  { prenom: 'Abdou Aziz',           nom: 'Ndao',           matricule: 'CHF-013' },
  { prenom: 'Moustapha',            nom: 'Diop',           matricule: 'CHF-014' },
  { prenom: 'Mor',                  nom: 'Sylla',          matricule: 'CHF-015' },
  { prenom: 'Seynabou',             nom: 'Ndao',           matricule: 'CHF-016' },
  { prenom: 'Djibril',              nom: 'Ndao',           matricule: 'CHF-017' },
  { prenom: 'Mouhamed Moussa',      nom: 'Drame',          matricule: 'CHF-018' },
  { prenom: 'Abdoulaye',            nom: 'Coume',          matricule: 'CHF-019' },
  { prenom: 'Khady',                nom: 'Dia',            matricule: 'CHF-020' },
  { prenom: 'Djibril',              nom: 'Dione',          matricule: 'CHF-021' },
  { prenom: 'Oumar Fakeba',         nom: 'Drame',          matricule: 'CHF-022' },
  { prenom: 'Fatou',                nom: 'Ndao',           matricule: 'CHF-023' },
  { prenom: 'Mamadou',              nom: 'Cisse',          matricule: 'CHF-024' },
  { prenom: 'Moustapha',            nom: 'Ndao',           matricule: 'CHF-025' },
  { prenom: 'El Hadj Malick',       nom: 'Thioye',         matricule: 'CHF-026' },
  { prenom: 'Saliou',               nom: 'Gaye',           matricule: 'CHF-027' },
  { prenom: 'Aly Bocar',            nom: 'Ba',             matricule: 'CHF-028' },
  { prenom: 'Babacar',              nom: 'Ndao',           matricule: 'CHF-029' },
  { prenom: 'Joseline Nathalie',    nom: 'Badiane',        matricule: 'CHF-030' },
  { prenom: 'Ahmed Sakhir',         nom: 'Ndao',           matricule: 'CHF-031' },
  { prenom: 'Samm',                 nom: 'Ndong',          matricule: 'CHF-032' },
  { prenom: 'Mame Malick',          nom: 'Top',            matricule: 'CHF-033' },
  { prenom: 'Ndiawar',              nom: 'Ndao',           matricule: 'CHF-034' },
  { prenom: 'El Hadj Mor',          nom: 'Ndiaye',         matricule: 'CHF-035' },
  { prenom: 'Yande',                nom: 'Sarr',           matricule: 'CHF-036' },
  { prenom: 'Bassirou',             nom: 'Diedhiou',       matricule: 'CHF-037' },
  { prenom: 'Mouhamed',             nom: 'Ndao Kaffrine',  matricule: 'CHF-038' },
  { prenom: 'Borom',                nom: 'Bakh',           matricule: 'CHF-039' },
  { prenom: 'Pape',                 nom: 'Konteye',        matricule: 'CHF-040' },
  { prenom: 'El Hadj Mor',          nom: 'Ndao',           matricule: 'CHF-041' },
  { prenom: 'Ahmadou Bamba',        nom: 'K.',             matricule: 'CHF-042' },
  { prenom: 'Kebe Ameth',           nom: 'Fadel',          matricule: 'CHF-043' },
  { prenom: 'Matar Nar',            nom: 'K.',             matricule: 'CHF-044' },
  { prenom: 'Ndiaye Saydi Idrissa', nom: 'K.',             matricule: 'CHF-045' },
  { prenom: 'Mouhamadou Fadal',     nom: 'K.',             matricule: 'CHF-046' },
  { prenom: 'Cheikh Ahmadou Sakhir',nom: 'K.',             matricule: 'CHF-047' },
  { prenom: 'Khadim Saliou',        nom: 'Ndiaye',         matricule: 'CHF-048' },
  { prenom: 'Sokhna Maï',           nom: 'Ndao',           matricule: 'CHF-049' },
  { prenom: 'Souleymane',           nom: 'Ndiaye',         matricule: 'CHF-050' },
  { prenom: 'Mame Diodio',          nom: 'Ndao',           matricule: 'CHF-051' },
  { prenom: 'Moth Ousmane',         nom: 'Ndao',           matricule: 'CHF-052' },
  { prenom: 'Babacar',              nom: 'Gueye',          matricule: 'CHF-053' },
  { prenom: 'Alioune Badara',       nom: 'Gueye',          matricule: 'CHF-054' },
  { prenom: 'Amdy',                 nom: 'Niang',          matricule: 'CHF-055' },
  { prenom: 'El Hadj Abdou',        nom: 'Ndao',           matricule: 'CHF-056' },
  { prenom: 'Gorgui Mactar',        nom: 'Gassama',        matricule: 'CHF-057' },
  { prenom: 'Cheikh',               nom: 'Gaye',           matricule: 'CHF-058' },
  { prenom: 'Khady',                nom: 'Mbaye',          matricule: 'CHF-059' },
  { prenom: 'Codou',                nom: 'Sene',           matricule: 'CHF-060' },
  { prenom: 'Mamadou',              nom: 'Ndiaye',         matricule: 'CHF-061' },
  { prenom: 'Mouhamed',             nom: 'Ndao',           matricule: 'CHF-062' },
  { prenom: 'Mame Ngor',            nom: 'Ndiaye',         matricule: 'CHF-063' },
  { prenom: 'Cheikhou',             nom: 'Samb',           matricule: 'CHF-064' },
  { prenom: 'Mbaye',                nom: 'Ndao',           matricule: 'CHF-065' },
  { prenom: 'Abdou',                nom: 'Ndiaye',         matricule: 'CHF-066' },
  { prenom: 'Modou Baye',           nom: 'Fall',           matricule: 'CHF-067' },
  { prenom: 'Mouhamed',             nom: 'Ndir',           matricule: 'CHF-068' },
  { prenom: 'Modou Kara',           nom: 'Dieng',          matricule: 'CHF-069' },
  { prenom: 'Fallou',               nom: 'Sarr',           matricule: 'CHF-070' },
  { prenom: 'Ibrahima',             nom: 'Fall',           matricule: 'CHF-071' },
  { prenom: 'Ameth',                nom: 'Lo',             matricule: 'CHF-072' },
  { prenom: 'Aïssata',              nom: 'Diallo',         matricule: 'CHF-073' },
]

// ─── Capacité réservoir par défaut ───────────────────────────────────────────

function getCapacite(type: string, modele: string): number {
  if (type === 'CAMION') return 80
  const grand = ['Land Cruiser', 'Highlander', 'QX80', 'Explorer', 'X7', 'GLE 350', 'Sport']
  if (grand.some(m => modele.includes(m))) return 90
  const moyen = ['Santa Fe', 'RAV4', 'Tucson', 'Tiguan', 'Sportage', 'Rogue', '3008', '5008', 'QM6', 'Equinox', 'Edge', 'Taurus', 'Hilux']
  if (moyen.some(m => modele.includes(m))) return 70
  return 60
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Démarrage du seed...\n')

  // ── Comptes utilisateurs ──────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash('Admin@2025', 12)
  const fuelPwd  = await bcrypt.hash('Fuel@2025', 12)
  const repPwd   = await bcrypt.hash('Repair@2025', 12)

  await prisma.user.upsert({
    where:  { email: 'admin@ndoukouman.com' },
    update: {},
    create: { email: 'admin@ndoukouman.com', name: 'Responsable Principal', password: adminPwd, role: 'ADMIN' },
  })
  await prisma.user.upsert({
    where:  { email: 'carburant@ndoukouman.com' },
    update: {},
    create: { email: 'carburant@ndoukouman.com', name: 'Gestionnaire Carburant', password: fuelPwd, role: 'CARBURANT' },
  })
  await prisma.user.upsert({
    where:  { email: 'reparation@ndoukouman.com' },
    update: {},
    create: { email: 'reparation@ndoukouman.com', name: 'Gestionnaire Réparations', password: repPwd, role: 'REPARATION' },
  })
  console.log('✅ Comptes créés (admin / carburant / reparation)')

  // ── Véhicules ─────────────────────────────────────────────────────────────
  let nbVehicules = 0
  for (const v of VEHICULES) {
    await prisma.vehicule.upsert({
      where:  { immatriculation: v.immatriculation },
      update: {
        marque: v.marque,
        modele: v.modele,
        annee:  v.annee ?? undefined,
        type:   v.type,
        statut: v.statut,
        notes:  v.notes ?? undefined,
        capaciteReservoir: getCapacite(v.type, v.modele),
      },
      create: {
        immatriculation:   v.immatriculation,
        marque:            v.marque,
        modele:            v.modele,
        annee:             v.annee ?? undefined,
        type:              v.type,
        statut:            v.statut,
        notes:             v.notes ?? undefined,
        capaciteReservoir: getCapacite(v.type, v.modele),
        niveauActuel:      0,
      },
    })
    nbVehicules++
  }
  console.log(`✅ ${nbVehicules} véhicules importés`)

  // ── Personnel ─────────────────────────────────────────────────────────────
  let nbChauffeurs = 0
  for (const c of CHAUFFEURS) {
    await prisma.personnel.upsert({
      where:  { matricule: c.matricule },
      update: { nom: c.nom, prenom: c.prenom },
      create: { nom: c.nom, prenom: c.prenom, role: 'CHAUFFEUR', matricule: c.matricule },
    })
    nbChauffeurs++
  }
  console.log(`✅ ${nbChauffeurs} chauffeurs importés`)

  // ── Mécanicien démo ───────────────────────────────────────────────────────
  await prisma.personnel.upsert({
    where:  { matricule: 'MEC-001' },
    update: {},
    create: { nom: 'Ndiaye', prenom: 'Ibrahima', role: 'MECANO', matricule: 'MEC-001' },
  })
  console.log('✅ Mécanicien démo conservé (MEC-001)')

  // ── Assignations véhicule → chauffeur ─────────────────────────────────────
  const ASSIGNMENTS: { immat: string; matricule: string }[] = [
    { immat: 'AA835CM',  matricule: 'CHF-001' },
    { immat: 'AA081DF',  matricule: 'CHF-002' },
    { immat: 'AA735ME',  matricule: 'CHF-003' },
    { immat: 'AA819KP',  matricule: 'CHF-004' },
    { immat: 'AA649CZ',  matricule: 'CHF-005' },
    { immat: 'AA523ES',  matricule: 'CHF-006' },
    { immat: 'AA419AJ',  matricule: 'CHF-007' },
    { immat: 'AA292KE',  matricule: 'CHF-008' },
    { immat: 'AA445EA',  matricule: 'CHF-009' },
    { immat: 'AA849FE',  matricule: 'CHF-010' },
    { immat: 'DK0692BL', matricule: 'CHF-011' },
    { immat: 'AA284DN',  matricule: 'CHF-012' },
    { immat: 'AA434CW',  matricule: 'CHF-013' },
    { immat: 'AA514CA',  matricule: 'CHF-014' },
    { immat: 'AA318EM',  matricule: 'CHF-015' },
    { immat: 'AA910FD',  matricule: 'CHF-016' },
    { immat: 'AA689BL',  matricule: 'CHF-017' },
    { immat: 'AA500FE',  matricule: 'CHF-018' },
    { immat: 'AA521DS',  matricule: 'CHF-019' },
    { immat: 'AA855ED',  matricule: 'CHF-020' },
    { immat: 'AA741MK',  matricule: 'CHF-021' },
    { immat: 'AA482CF',  matricule: 'CHF-022' },
    { immat: 'DK1384BK', matricule: 'CHF-023' },
    { immat: 'AA101DQ',  matricule: 'CHF-024' },
    { immat: 'AA920DQ',  matricule: 'CHF-025' },
    { immat: 'DK8728AY', matricule: 'CHF-026' },
    { immat: 'DK5007BM', matricule: 'CHF-027' },
    { immat: 'DK4887BM', matricule: 'CHF-028' },
    { immat: 'AA095AL',  matricule: 'CHF-029' },
    { immat: 'AA716DE',  matricule: 'CHF-030' },
    { immat: 'AA987MT',  matricule: 'CHF-031' },
    { immat: 'DK2561BE', matricule: 'CHF-032' },
    { immat: 'DK2703BH', matricule: 'CHF-033' },
    { immat: 'DK3494BD', matricule: 'CHF-034' },
    { immat: 'AA357BR',  matricule: 'CHF-035' },
    { immat: 'AA858RZ',  matricule: 'CHF-036' },
    { immat: 'AA145FB',  matricule: 'CHF-037' },
    { immat: 'AA689SS',  matricule: 'CHF-038' },
    { immat: 'AB026FJ',  matricule: 'CHF-039' },
    { immat: 'AA589MR',  matricule: 'CHF-040' },
    { immat: 'AA380VH',  matricule: 'CHF-041' },
    { immat: 'AA808AR',  matricule: 'CHF-042' },
    { immat: 'AA868HD',  matricule: 'CHF-043' },
    { immat: 'AA667ED',  matricule: 'CHF-044' },
    { immat: 'AA664AG',  matricule: 'CHF-045' },
    { immat: 'AA894FL',  matricule: 'CHF-046' },
    { immat: 'AA212JT',  matricule: 'CHF-047' },
    { immat: 'AA196TA',  matricule: 'CHF-048' },
    { immat: 'AA691RW',  matricule: 'CHF-049' },
    { immat: 'AA488YM',  matricule: 'CHF-050' },
    { immat: 'AA026FY',  matricule: 'CHF-051' },
    { immat: 'AA058VP',  matricule: 'CHF-052' },
    { immat: 'AA236VH',  matricule: 'CHF-053' },
    { immat: 'AA876TP',  matricule: 'CHF-054' },
    { immat: 'AA571VL',  matricule: 'CHF-055' },
    { immat: 'AA412LX',  matricule: 'CHF-056' },
    { immat: 'AA662NF',  matricule: 'CHF-057' },
    { immat: 'DK3834BH', matricule: 'CHF-058' },
    { immat: 'AA998SX',  matricule: 'CHF-059' },
    { immat: 'AB999FK',  matricule: 'CHF-060' },
    { immat: 'AA270LY',  matricule: 'CHF-061' },
    { immat: 'AA240TM',  matricule: 'CHF-062' },
    { immat: 'AA758AK',  matricule: 'CHF-063' },
    { immat: 'AA937PR',  matricule: 'CHF-064' },
    { immat: 'AA958PR',  matricule: 'CHF-065' },
    { immat: 'AA130MJ',  matricule: 'CHF-066' },
    { immat: 'AA348EM',  matricule: 'CHF-067' },
    { immat: 'AA102MK',  matricule: 'CHF-068' },
    { immat: 'AA347EM',  matricule: 'CHF-069' },
    { immat: 'AA307RP',  matricule: 'CHF-070' },
    { immat: 'AA535TZ',  matricule: 'CHF-071' },
    { immat: 'AA777EH',  matricule: 'CHF-072' },
  ]

  let nbAssign = 0
  for (const a of ASSIGNMENTS) {
    const vehicule  = await prisma.vehicule.findUnique({ where: { immatriculation: a.immat } })
    const chauffeur = await prisma.personnel.findUnique({ where: { matricule: a.matricule } })
    if (vehicule && chauffeur) {
      await prisma.vehicule.update({
        where: { id: vehicule.id },
        data:  { personnelAssigneId: chauffeur.id },
      })
      nbAssign++
    }
  }
  console.log(`✅ ${nbAssign} assignations véhicule → chauffeur`)

  console.log('\n🚀 Base de données prête !')
  console.log('   Connexion admin : admin@ndoukouman.com / Admin@2025')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
