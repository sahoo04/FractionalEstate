-- Add missing column to rent_deposits table
-- Run this in Supabase SQL Editor

ALTER TABLE rent_deposits 
ADD COLUMN IF NOT EXISTS summary_ipfs_hash TEXT;

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rent_deposits' 
AND column_name = 'summary_ipfs_hash';
