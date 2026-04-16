-- CreateEnum
CREATE TYPE "RoleUser" AS ENUM ('ADMIN', 'CARBURANT', 'REPARATION');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CAMION', 'VOITURE');

-- CreateEnum
CREATE TYPE "StatutVehicule" AS ENUM ('ACTIF', 'EN_REPARATION', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "RolePersonnel" AS ENUM ('CHAUFFEUR', 'MECANO', 'RESPONSABLE_SERVICE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "RoleUser" NOT NULL DEFAULT 'CARBURANT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "annee" INTEGER,
    "capaciteReservoir" DOUBLE PRECISION NOT NULL,
    "niveauActuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" "StatutVehicule" NOT NULL DEFAULT 'ACTIF',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "RolePersonnel" NOT NULL,
    "telephone" TEXT,
    "matricule" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SortieCarburant" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "litres" DOUBLE PRECISION NOT NULL,
    "prixLitre" DOUBLE PRECISION NOT NULL,
    "coutTotal" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SortieCarburant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reparation" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "personnelId" TEXT,
    "description" TEXT NOT NULL,
    "cout" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pieces" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteCarburant" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "seuil" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlerteCarburant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_immatriculation_key" ON "Vehicule"("immatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_matricule_key" ON "Personnel"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "AlerteCarburant_vehiculeId_key" ON "AlerteCarburant"("vehiculeId");

-- AddForeignKey
ALTER TABLE "SortieCarburant" ADD CONSTRAINT "SortieCarburant_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortieCarburant" ADD CONSTRAINT "SortieCarburant_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortieCarburant" ADD CONSTRAINT "SortieCarburant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparation" ADD CONSTRAINT "Reparation_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparation" ADD CONSTRAINT "Reparation_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparation" ADD CONSTRAINT "Reparation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteCarburant" ADD CONSTRAINT "AlerteCarburant_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
