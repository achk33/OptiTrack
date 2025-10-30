/**
 * Utility functions for maintenance periodicity calculations
 */

export enum Periodicite {
  MIS = 'MIS',         // 1 month
  TRI = 'TRI',         // 3 months
  SEMESTRE = 'SEMESTRE', // 6 months
  ANNUEL = 'ANNUEL'     // 12 months
}

/**
 * Get the number of months for a given periodicity
 */
export function getMonthsFromPeriodicite(periodicite: string): number {
  switch (periodicite) {
    case Periodicite.MIS:
      return 1;
    case Periodicite.TRI:
      return 3;
    case Periodicite.SEMESTRE:
      return 6;
    case Periodicite.ANNUEL:
      return 12;
    default:
      return 1;
  }
}

/**
 * Calculate the next maintenance date based on last date and periodicity
 * @param lastDate - The last maintenance date
 * @param periodicite - The maintenance period (MIS, TRI, SEMESTRE, ANNUEL)
 * @returns The next scheduled maintenance date
 */
export function calculateNextMaintenanceDate(
  lastDate: Date,
  periodicite: string
): Date {
  const months = getMonthsFromPeriodicite(periodicite);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

/**
 * Get a human-readable label for periodicity
 */
export function getPeriodiciteLabel(periodicite: string): string {
  switch (periodicite) {
    case Periodicite.MIS:
      return 'Mensuel (1 mois)';
    case Periodicite.TRI:
      return 'Trimestriel (3 mois)';
    case Periodicite.SEMESTRE:
      return 'Semestriel (6 mois)';
    case Periodicite.ANNUEL:
      return 'Annuel (12 mois)';
    default:
      return 'Inconnu';
  }
}

/**
 * Get all available periodicities with their metadata
 */
export function getAllPeriodicites() {
  return [
    { value: Periodicite.MIS, label: 'Mensuel', months: 1 },
    { value: Periodicite.TRI, label: 'Trimestriel', months: 3 },
    { value: Periodicite.SEMESTRE, label: 'Semestriel', months: 6 },
    { value: Periodicite.ANNUEL, label: 'Annuel', months: 12 },
  ];
}
