/**
 * Example: Next Maintenance Date Calculation
 * 
 * This file demonstrates how the system automatically calculates
 * the next maintenance date based on periodicity.
 */

import { calculateNextMaintenanceDate } from '../backend/src/utils/periodicite';

// ============================================================
// EXAMPLE 1: Monthly Maintenance (MIS)
// ============================================================

const lastMaintenanceMIS = new Date('2025-10-01');
const nextDateMIS = calculateNextMaintenanceDate(lastMaintenanceMIS, 'MIS');

console.log('Example 1: Monthly Maintenance (MIS)');
console.log('Last Maintenance:', lastMaintenanceMIS.toISOString().split('T')[0]);
console.log('Periodicity: MIS (1 month)');
console.log('Next Maintenance:', nextDateMIS.toISOString().split('T')[0]);
console.log(''); // 2025-11-01

// ============================================================
// EXAMPLE 2: Quarterly Maintenance (TRI)
// ============================================================

const lastMaintenanceTRI = new Date('2025-10-15');
const nextDateTRI = calculateNextMaintenanceDate(lastMaintenanceTRI, 'TRI');

console.log('Example 2: Quarterly Maintenance (TRI)');
console.log('Last Maintenance:', lastMaintenanceTRI.toISOString().split('T')[0]);
console.log('Periodicity: TRI (3 months)');
console.log('Next Maintenance:', nextDateTRI.toISOString().split('T')[0]);
console.log(''); // 2026-01-15

// ============================================================
// EXAMPLE 3: Semi-Annual Maintenance (SEMESTRE)
// ============================================================

const lastMaintenanceSEMESTRE = new Date('2025-06-01');
const nextDateSEMESTRE = calculateNextMaintenanceDate(lastMaintenanceSEMESTRE, 'SEMESTRE');

console.log('Example 3: Semi-Annual Maintenance (SEMESTRE)');
console.log('Last Maintenance:', lastMaintenanceSEMESTRE.toISOString().split('T')[0]);
console.log('Periodicity: SEMESTRE (6 months)');
console.log('Next Maintenance:', nextDateSEMESTRE.toISOString().split('T')[0]);
console.log(''); // 2025-12-01

// ============================================================
// EXAMPLE 4: Annual Maintenance (ANNUEL)
// ============================================================

const lastMaintenanceANNUEL = new Date('2025-01-10');
const nextDateANNUEL = calculateNextMaintenanceDate(lastMaintenanceANNUEL, 'ANNUEL');

console.log('Example 4: Annual Maintenance (ANNUEL)');
console.log('Last Maintenance:', lastMaintenanceANNUEL.toISOString().split('T')[0]);
console.log('Periodicity: ANNUEL (12 months)');
console.log('Next Maintenance:', nextDateANNUEL.toISOString().split('T')[0]);
console.log(''); // 2026-01-10

// ============================================================
// REAL-WORLD SCENARIO: PM Plan for Laptops
// ============================================================

console.log('Real-World Scenario: Laptop Maintenance Plan');
console.log('==============================================');

// PM Plan: "Monthly Laptop Maintenance"
const pmPlan = {
  name: 'PM Laptop Siège',
  scopeType: 'Categorie',
  scopeValue: 'Laptop',
  periodicite: 'MIS',
  taches: [
    { label: 'Nettoyage physique', done: false },
    { label: 'Mise à jour OS', done: false },
    { label: 'Vérification disque', done: false }
  ],
  lastRunAt: new Date('2025-10-01'),
  ownerRole: 'Technicien'
};

console.log('PM Plan:', pmPlan.name);
console.log('Scope:', pmPlan.scopeType, '-', pmPlan.scopeValue);
console.log('Last Run:', pmPlan.lastRunAt.toISOString().split('T')[0]);
console.log('Periodicity:', pmPlan.periodicite, '(1 month)');

const nextRun = calculateNextMaintenanceDate(pmPlan.lastRunAt, pmPlan.periodicite);
console.log('Next Run:', nextRun.toISOString().split('T')[0]);
console.log('');

// Calculate multiple future runs
console.log('Future Maintenance Schedule:');
let currentDate = pmPlan.lastRunAt;
for (let i = 1; i <= 6; i++) {
  currentDate = calculateNextMaintenanceDate(currentDate, pmPlan.periodicite);
  console.log(`  Run ${i + 1}:`, currentDate.toISOString().split('T')[0]);
}

// ============================================================
// OUTPUT EXAMPLE
// ============================================================

/*
Example 1: Monthly Maintenance (MIS)
Last Maintenance: 2025-10-01
Periodicity: MIS (1 month)
Next Maintenance: 2025-11-01

Example 2: Quarterly Maintenance (TRI)
Last Maintenance: 2025-10-15
Periodicity: TRI (3 months)
Next Maintenance: 2026-01-15

Example 3: Semi-Annual Maintenance (SEMESTRE)
Last Maintenance: 2025-06-01
Periodicity: SEMESTRE (6 months)
Next Maintenance: 2025-12-01

Example 4: Annual Maintenance (ANNUEL)
Last Maintenance: 2025-01-10
Periodicity: ANNUEL (12 months)
Next Maintenance: 2026-01-10

Real-World Scenario: Laptop Maintenance Plan
==============================================
PM Plan: PM Laptop Siège
Scope: Categorie - Laptop
Last Run: 2025-10-01
Periodicity: MIS (1 month)
Next Run: 2025-11-01

Future Maintenance Schedule:
  Run 2: 2025-11-01
  Run 3: 2025-12-01
  Run 4: 2026-01-01
  Run 5: 2026-02-01
  Run 6: 2026-03-01
  Run 7: 2026-04-01
*/
