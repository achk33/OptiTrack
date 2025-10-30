-- Migration script to convert periodicite from string to enum
-- Step 1: Add temporary column with enum type
ALTER TABLE "PMPlan" ADD COLUMN "periodicite_new" "Periodicite" NOT NULL DEFAULT 'MIS';

-- Step 2: Convert existing values
UPDATE "PMPlan" 
SET "periodicite_new" = 
  CASE 
    WHEN "periodicite" = 'mensuel' THEN 'MIS'::"Periodicite"
    WHEN "periodicite" = 'trimestriel' THEN 'TRI'::"Periodicite"
    WHEN "periodicite" = 'semestriel' THEN 'SEMESTRE'::"Periodicite"
    WHEN "periodicite" = 'annuel' THEN 'ANNUEL'::"Periodicite"
    ELSE 'MIS'::"Periodicite"
  END;

-- Step 3: Drop old column
ALTER TABLE "PMPlan" DROP COLUMN "periodicite";

-- Step 4: Rename new column to original name
ALTER TABLE "PMPlan" RENAME COLUMN "periodicite_new" TO "periodicite";

-- Step 5: Add lastRunAt field
ALTER TABLE "PMPlan" ADD COLUMN "lastRunAt" TIMESTAMP(3);
