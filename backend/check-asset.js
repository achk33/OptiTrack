const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAsset() {
  try {
    // Check total count
    const total = await prisma.asset.count();
    console.log('Total assets in DB:', total);

    // Check for 01022 (including deleted)
    const asset1 = await prisma.asset.findFirst({ 
      where: { Matricule: '01022' },
      select: { Matricule: true, NomPrenom: true, deletedAt: true }
    });
    console.log('\nAsset 01022:', asset1);

    // Check for 1022 (including deleted)
    const asset2 = await prisma.asset.findFirst({ 
      where: { Matricule: '1022' },
      select: { Matricule: true, NomPrenom: true, deletedAt: true }
    });
    console.log('Asset 1022:', asset2);

    // Search for similar (including deleted)
    const similar = await prisma.asset.findMany({
      where: {
        Matricule: { contains: '1022' }
      },
      select: { Matricule: true, NomPrenom: true, deletedAt: true },
      take: 10
    });
    console.log('\nSimilar assets containing 1022:', similar);

    // Show first 10 assets
    const first10 = await prisma.asset.findMany({
      where: { deletedAt: null },
      select: { Matricule: true, NomPrenom: true },
      take: 10,
      orderBy: { Matricule: 'asc' }
    });
    console.log('\nFirst 10 active assets:', first10);

    // Show last 10 assets
    const last10 = await prisma.asset.findMany({
      where: { deletedAt: null },
      select: { Matricule: true, NomPrenom: true },
      take: 10,
      orderBy: { Matricule: 'desc' }
    });
    console.log('\nLast 10 active assets:', last10);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAsset();
