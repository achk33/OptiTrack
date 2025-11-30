import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { parseBufferToRows, normalizeRow } from './utils/import';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('Admin!123', 10);
  const techPass = await bcrypt.hash('Tech!123', 10);
  const readPass = await bcrypt.hash('Lecteur!123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: adminPass, role: Role.ADMIN }
  });
  await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {},
    create: { firstName: 'Tech', lastName: 'User', email: 'tech@example.com', password: techPass, role: Role.TECHNICIEN }
  });
  await prisma.user.upsert({
    where: { email: 'lecteur@example.com' },
    update: {},
    create: { firstName: 'Lecteur', lastName: 'User', email: 'lecteur@example.com', password: readPass, role: Role.VIEWER }
  });

  // Seed assets from CSV if empty
  const initialAssetCount = await prisma.asset.count();
  if (initialAssetCount === 0) {
    const csvPath = path.resolve(__dirname, '../../Book1_regenerated.csv');
    if (fs.existsSync(csvPath)) {
      const buf = fs.readFileSync(csvPath);
      const rawRows = parseBufferToRows(buf);
      const rows = rawRows.map(normalizeRow);
      const existingSNsArr = await prisma.asset.findMany({ select: { SerialNumber: true } });
      const existingSNs = new Set(existingSNsArr.map(a => a.SerialNumber).filter(Boolean) as string[]);
      const seenSerials = new Set<string>();
      let imported = 0;
      for (const r of rows) {
        if (!r.Matricule) continue;
        const data: any = {
          ...r,
          DateDePassage: (r as any)?.DateDePassage,
          Categorie: mapCategorie(r.Categorie),
          Etat: mapEtat(r.Etat),
          Validation: mapValidation(r.Validation)
        };
        let sn = (data.SerialNumber || '').trim();
        if (sn && (seenSerials.has(sn) || existingSNs.has(sn))) {
          sn = `${sn}-${data.Matricule}`;
        }
        if (sn) {
          data.SerialNumber = sn;
          seenSerials.add(sn);
        }
        await prisma.asset.upsert({ where: { Matricule: data.Matricule }, update: data, create: data });
        imported++;
      }
      console.log(`Seed: imported ${imported} assets from CSV`);
    } else {
      console.warn('Seed: CSV file not found, creating two sample assets...');
      await prisma.asset.upsert({
        where: { Matricule: 'SBS-0001' },
        update: { Code: 'UC110398' } as any,
        create: {
          Matricule: 'SBS-0001', NomPrenom: 'Jean Dupont', Entite: 'Siège',
          Categorie: 'Laptop', Marque: 'Dell', Modele: 'Latitude 7420',
          Code: 'UC110398', SerialNumber: 'SN123456', Etat: 'En_service', Validation: 'OK', Remarque: '',
          DateDePassage: new Date()
        } as any
      });
      await prisma.asset.upsert({
        where: { Matricule: 'SBS-0002' },
        update: { Code: 'IL160194' } as any,
        create: {
          Matricule: 'SBS-0002', NomPrenom: 'Marie Curie', Entite: 'Siège',
          Categorie: 'Micro_ordinateur', Marque: 'HP', Modele: 'ProDesk',
          Code: 'IL160194', SerialNumber: 'SN654321', Etat: 'En_service', Validation: 'A_verifier', Remarque: ''
        } as any
      });
    }
  }

  const plan = await prisma.pMPlan.upsert({
    where: { id: 'seed-plan-1' },
    update: {},
    create: {
      id: 'seed-plan-1', name: 'PM Laptop Siège', scopeType: 'Entite', scopeValue: 'Siège',
      periodicite: 'MIS', taches: [{ label: 'Nettoyage', done: false }, { label: 'MAJ OS', done: false }],
      ownerRole: 'TECHNICIEN', nextRunAt: new Date(), active: true
    } as any
  });

  // Ensure ~30 demo WorkOrders exist, spread over last 12 months
  const existingWOCount = await prisma.workOrder.count();
  const targetWO = 30;
  if (existingWOCount < targetWO) {
    const assets = await prisma.asset.findMany({ select: { Matricule: true, Categorie: true, Entite: true } });
    if (assets.length > 0) {
      const need = targetWO - existingWOCount;
      const priorites = ['Basse', 'Moyenne', 'Haute'];
      const statuts = ['Ouvert', 'En cours', 'Terminé'];
      const tachesBase = (plan?.taches as any) || [{ label: 'Vérification', done: false }];
      for (let i = 0; i < need; i++) {
        const a = assets[i % assets.length];
        const monthsAgo = i % 12; // distribute across last 12 months
        const createdAt = dayjs().subtract(monthsAgo, 'month').subtract(Math.floor(Math.random()*25), 'day').toDate();
        const due = dayjs(createdAt).add(7 + Math.floor(Math.random()*21), 'day').toDate();
        const priorite = priorites[i % priorites.length];
        const statut = statuts[i % statuts.length];

        await prisma.workOrder.create({
          data: {
            assetMatricule: a.Matricule,
            pmPlanId: plan?.id,
            taches: tachesBase,
            priorite,
            assigne: 'tech@example.com',
            echeance: due,
            statut,
            createdAt,
            updatedAt: createdAt,
          } as any,
        });
      }
      console.log(`Seed: created ${need} demo WorkOrders`);
    }
  }
  console.log('Seed complete: users, assets (CSV if empty), PM plan, and demo WOs ensured');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

function mapCategorie(c?: string): any {
  const s = (c || '').toLowerCase();
  if (s.includes('micro')) return 'Micro_ordinateur';
  if (s.includes('laptop') || s.includes('portable')) return 'Laptop';
  if (s.includes('serveur') || s.includes('server')) return 'Serveur';
  if (s.includes('imprimante') || s.includes('printer')) return 'Imprimante';
  return 'Autre';
}

function mapEtat(e?: string): any { return (e?.replace(' ', '_') as any) || 'En_service'; }

function mapValidation(v?: string): any {
  const s = (v || '').toLowerCase();
  if (s === 'ok' || s.includes('confirme')) return 'OK';
  if (s === 'no' || s.includes('non')) return 'Non_conforme';
  if (s.includes('vérifier') || s.includes('verifier')) return 'A_verifier';
  return 'A_verifier';
}
