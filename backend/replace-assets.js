const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function replaceAssets() {
  try {
    console.log('🗑️  Clearing existing data...');
    
    // Delete work orders first (foreign key constraint)
    const deleteWorkOrders = await prisma.workOrder.deleteMany({});
    console.log(`✅ Deleted ${deleteWorkOrders.count} work orders`);
    
    // Delete all existing assets
    const deleteResult = await prisma.asset.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} existing assets`);
    
    console.log('📊 Reading new CSV data...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'Book1_regenerated.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    console.log(`📄 Found ${lines.length - 1} rows to import`);
    console.log(`📋 Headers: ${headers.join(', ')}`);
    
    const assets = [];
    const seenSerialNumbers = new Set();
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;
      
      const asset = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        
        switch (header.trim()) {
          case 'Matricule':
            asset.Matricule = value;
            break;
          case 'Nom-Prenom':
            asset.NomPrenom = value || null;
            break;
          case 'Entite':
            asset.Entite = value || null;
            break;
          case 'Categorie':
            // Map to enum values
            if (value === 'Micro-ordinateur') asset.Categorie = 'Micro_ordinateur';
            else if (value === 'Laptop') asset.Categorie = 'Laptop';
            else if (value === 'Serveur') asset.Categorie = 'Serveur';
            else if (value === 'Imprimante') asset.Categorie = 'Imprimante';
            else asset.Categorie = 'Autre';
            break;
          case 'Marque':
            asset.Marque = value || null;
            break;
          case 'Modele':
            asset.Modele = value || null;
            break;
          case 'Code':
            asset.Code = value || null;
            break;
          case 'Serial Number':
            // Handle duplicate serial numbers by making them unique or setting to null
            if (value && value.trim()) {
              if (seenSerialNumbers.has(value)) {
                // Make it unique by appending the Matricule
                asset.SerialNumber = `${value}-${asset.Matricule}`;
              } else {
                asset.SerialNumber = value;
                seenSerialNumbers.add(value);
              }
            } else {
              asset.SerialNumber = null;
            }
            break;
          case 'Validation':
            // Map validation values
            if (value === 'OK') asset.Validation = 'OK';
            else if (value === 'A_verifier') asset.Validation = 'A_verifier';
            else if (value === 'NO') asset.Validation = 'Non_conforme';
            else asset.Validation = 'A_verifier';
            break;
          case 'Remarque':
            asset.Remarque = value || null;
            break;
          case 'Date De Passage':
            if (value && value.trim()) {
              try {
                // Parse M/D/YYYY format
                const parts = value.split('/');
                if (parts.length === 3) {
                  const month = parseInt(parts[0]);
                  const day = parseInt(parts[1]);
                  const year = parseInt(parts[2]);
                  asset.DateDePassage = new Date(year, month - 1, day);
                }
              } catch (e) {
                console.warn(`⚠️  Could not parse date: ${value}`);
                asset.DateDePassage = null;
              }
            } else {
              asset.DateDePassage = null;
            }
            break;
        }
      });
      
      // Set default values
      asset.Etat = 'En_service';
      
      if (asset.Matricule) {
        assets.push(asset);
      }
    }
    
    console.log(`🔄 Importing ${assets.length} assets...`);
    
    // Import assets one by one to handle duplicates
    let imported = 0;
    let errors = 0;
    
    for (const asset of assets) {
      try {
        await prisma.asset.create({ data: asset });
        imported++;
      } catch (error) {
        console.warn(`⚠️  Error importing asset ${asset.Matricule}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`✅ Import completed!`);
    console.log(`   - Successfully imported: ${imported}`);
    console.log(`   - Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

replaceAssets();