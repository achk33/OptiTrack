import XLSX from 'xlsx';

export type AssetRow = {
  Matricule: string;
  'Nom-Prenom'?: string;
  'Nom Prenom'?: string;
  NomPrenom?: string;
  Entite?: string;
  Categorie?: string;
  Marque?: string;
  Modele?: string;
  Model?: string;
  Code?: string;
  'Serial Number'?: string;
  SerialNumber?: string;
  'NS(Serial Number)'?: string;
  NS?: string;
  Etat?: string;
  Validation?: string;
  Remarque?: string;
  Observation?: string;
  'Date de passage'?: string;
  'Date De Passage'?: string;
};

export function parseBufferToRows(buf: Buffer): AssetRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Raw JSON from XLSX:', json.length, 'rows');
  console.log('First raw row:', json[0]);
  console.log('Headers:', Object.keys(json[0] || {}));
  return json.map((r) => ({ ...r }));
}

export function normalizeRow(row: AssetRow) {
  console.log('Normalizing row:', row);
  const NomPrenom = row.NomPrenom || row['Nom-Prenom'] || row['Nom Prenom'] || '';
  const SerialNumber = row.SerialNumber || row['Serial Number'] || row['NS(Serial Number)'] || row.NS || '';
  const Modele = row.Modele || row.Model || '';
  const Remarque = row.Remarque || row.Observation || '';
  // Fix: Handle both 'Matricule' and 'Matricule ' (with space)
  const Matricule = row.Matricule || (row as any)['Matricule '] || '';
  const dateStr = (row['Date de passage'] || row['Date De Passage'] || '')?.toString()?.trim();
  let DateDePassage: Date | undefined = undefined;
  if (dateStr) {
    // Try M/D/YYYY format (American format)
    const m = dateStr.match(/^([0-1]?\d)\/([0-3]?\d)\/(\d{4})$/);
    if (m) {
      const mo = Number(m[1]) - 1; // Month
      const d = Number(m[2]);      // Day
      const y = Number(m[3]);      // Year
      const dt = new Date(Date.UTC(y, mo, d));
      if (!isNaN(dt.getTime())) DateDePassage = dt;
    } else {
      // Try DD/MM/YYYY format (European format)
      const m2 = dateStr.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
      if (m2) {
        const d = Number(m2[1]);
        const mo = Number(m2[2]) - 1;
        const y = Number(m2[3]);
        const dt = new Date(Date.UTC(y, mo, d));
        if (!isNaN(dt.getTime())) DateDePassage = dt;
      } else {
        // Fallback: native Date (YYYY-MM-DD or Excel date string)
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) DateDePassage = dt;
      }
    }
  }
  const normalized = {
    Matricule: String(Matricule || '').trim(),
    NomPrenom: String(NomPrenom).trim(),
    Entite: String(row.Entite || '').trim(),
    Categorie: String(row.Categorie || '').trim(),
    Marque: String(row.Marque || '').trim(),
    Modele: String(Modele || '').trim(),
    Code: String(row.Code || '').trim(),
    SerialNumber: String(SerialNumber).trim(),
    Etat: String(row.Etat || '').trim(),
    Validation: String(row.Validation || '').trim(),
    Remarque: String(Remarque || '').trim(),
    DateDePassage,
  };
  console.log('Normalized result:', normalized);
  return normalized;
}
