-- Migration: Update KYC Documents Table
-- Add personal information fields to kyc_documents table

-- Add new columns for personal information
ALTER TABLE kyc_documents 
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS id_type TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS address_proof_type TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Copy user_wallet to wallet_address for existing records
UPDATE kyc_documents 
SET wallet_address = user_wallet 
WHERE wallet_address IS NULL;

-- Create index on wallet_address
CREATE INDEX IF NOT EXISTS idx_kyc_wallet_address ON kyc_documents(wallet_address);

-- Note: Keep user_wallet column for backward compatibility
-- In a future migration, you can drop user_wallet column if needed:
-- ALTER TABLE kyc_documents DROP COLUMN user_wallet;
