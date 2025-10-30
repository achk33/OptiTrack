import cron from 'node-cron';
import dayjs from 'dayjs';
import { prisma } from '../db/client';

function addPeriod(date: Date, periodicite: string) {
  const d = dayjs(date);
  switch (periodicite) {
    case 'MIS': return d.add(1, 'month').toDate();
    case 'TRI': return d.add(3, 'month').toDate();
    case 'SEMESTRE': return d.add(6, 'month').toDate();
    case 'ANNUEL': return d.add(1, 'year').toDate();
    // Backward compatibility with old string values
    case 'mensuel': return d.add(1, 'month').toDate();
    case 'trimestriel': return d.add(3, 'month').toDate();
    case 'semestriel': return d.add(6, 'month').toDate();
    case 'annuel': return d.add(1, 'year').toDate();
    default: return d.add(1, 'month').toDate();
  }
}

export function startScheduler() {
  cron.schedule('0 3 * * *', async () => {
    const plans = await prisma.pMPlan.findMany({ where: { active: true } });
    for (const p of plans) {
      const due = p.nextRunAt && p.nextRunAt < new Date();
      if (!due) continue;
      let assetIds: string[] = [];
      if (p.scopeType === 'Categorie') {
        const assets = await prisma.asset.findMany({ where: { Categorie: p.scopeValue as any, deletedAt: null } });
        assetIds = assets.map(a => a.Matricule);
      } else if (p.scopeType === 'Entite') {
        const assets = await prisma.asset.findMany({ where: { Entite: p.scopeValue, deletedAt: null } });
        assetIds = assets.map(a => a.Matricule);
      } else {
        assetIds = p.scopeValue.split(',').map(s => s.trim()).filter(Boolean);
      }
      for (const m of assetIds) {
        await prisma.workOrder.create({ data: {
          assetMatricule: m,
          pmPlanId: p.id,
          taches: p.taches as any,
          priorite: 'Moyenne',
          echeance: dayjs().add(7, 'day').toDate(),
          statut: 'Ouvert'
        } });
      }
      await prisma.pMPlan.update({ where: { id: p.id }, data: { nextRunAt: addPeriod(p.nextRunAt || new Date(), p.periodicite) } });
    }
  });
}
