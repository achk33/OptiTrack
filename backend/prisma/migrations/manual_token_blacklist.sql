-- Manual Migration for TokenBlacklist Table
-- Run this if automatic Prisma migration fails
-- 
-- Usage:
--   psql -U your_username -d sbs -f backend/prisma/migrations/manual_token_blacklist.sql
-- Or connect to your database and run these commands directly

-- Create TokenBlacklist table
CREATE TABLE IF NOT EXISTS "TokenBlacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "TokenBlacklist_token_key" ON "TokenBlacklist"("token");

-- Create index on expiresAt for efficient cleanup
CREATE INDEX IF NOT EXISTS "TokenBlacklist_expiresAt_idx" ON "TokenBlacklist"("expiresAt");

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'TokenBlacklist'
ORDER BY 
    ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ TokenBlacklist table created successfully!';
END $$;
