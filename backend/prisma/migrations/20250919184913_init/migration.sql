-- CreateEnum
CREATE TYPE "Categorie" AS ENUM ('PC', 'Laptop', 'Serveur', 'Imprimante', 'Autre');

-- CreateEnum
CREATE TYPE "Etat" AS ENUM ('En_service', 'Hors_service', 'En_maintenance', 'Mis_au_rebut');

-- CreateEnum
CREATE TYPE "Validation" AS ENUM ('Conforme', 'Non_conforme', 'En_attente');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Technicien', 'Lecteur');

-- CreateTable
CREATE TABLE "Asset" (
    "Matricule" TEXT NOT NULL,
    "NomPrenom" TEXT,
    "Entite" TEXT,
    "Categorie" "Categorie" NOT NULL,
    "Marque" TEXT,
    "Modele" TEXT,
    "SerialNumber" TEXT,
    "Etat" "Etat" NOT NULL DEFAULT 'En_service',
    "Validation" "Validation" NOT NULL DEFAULT 'En_attente',
    "Remarque" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("Matricule")
);

-- CreateTable
CREATE TABLE "PMPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeValue" TEXT NOT NULL,
    "periodicite" TEXT NOT NULL,
    "taches" JSONB NOT NULL,
    "ownerRole" "Role" NOT NULL,
    "nextRunAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PMPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "assetMatricule" TEXT NOT NULL,
    "pmPlanId" TEXT,
    "taches" JSONB NOT NULL,
    "priorite" TEXT NOT NULL,
    "assigne" TEXT,
    "echeance" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL,
    "commentaires" JSONB NOT NULL DEFAULT '[]',
    "tempsPasse" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_SerialNumber_key" ON "Asset"("SerialNumber");

-- CreateIndex
CREATE INDEX "Asset_Entite_Categorie_Etat_Validation_idx" ON "Asset"("Entite", "Categorie", "Etat", "Validation");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetMatricule_fkey" FOREIGN KEY ("assetMatricule") REFERENCES "Asset"("Matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_pmPlanId_fkey" FOREIGN KEY ("pmPlanId") REFERENCES "PMPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
