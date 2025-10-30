import { prisma } from '../db/client';

describe('Asset unique constraints', () => {
  beforeAll(async () => { await prisma.$executeRawUnsafe('DELETE FROM "Asset";'); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('should enforce unique Matricule', async () => {
    await prisma.asset.create({ data: { Matricule: 'X1', Categorie: 'PC', Etat: 'En_service', Validation: 'En_attente' } as any });
    await expect(prisma.asset.create({ data: { Matricule: 'X1', Categorie: 'PC', Etat: 'En_service', Validation: 'En_attente' } as any })).rejects.toBeTruthy();
  });

  it('should enforce unique SerialNumber', async () => {
    await prisma.asset.create({ data: { Matricule: 'X2', SerialNumber: 'SN-1', Categorie: 'PC', Etat: 'En_service', Validation: 'En_attente' } as any });
    await expect(prisma.asset.create({ data: { Matricule: 'X3', SerialNumber: 'SN-1', Categorie: 'PC', Etat: 'En_service', Validation: 'En_attente' } as any })).rejects.toBeTruthy();
  });
});
