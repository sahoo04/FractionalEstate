-- Fix KYC documents table - make SBT fields nullable since they are only populated during approval
-- These fields are NULL when KYC is first submitted and only filled during approval

ALTER TABLE public.kyc_documents 
  ALTER COLUMN sbt_token_id DROP NOT NULL,
  ALTER COLUMN sbt_mint_tx_hash DROP NOT NULL,
  ALTER COLUMN sbt_metadata_cid DROP NOT NULL;

-- Also fix default status to PENDING instead of APPROVED
ALTER TABLE public.kyc_documents 
  ALTER COLUMN status SET DEFAULT 'PENDING';

-- Update any existing records without SBT data to have NULL instead of failing
UPDATE public.kyc_documents 
SET 
  sbt_token_id = NULL,
  sbt_mint_tx_hash = NULL,
  sbt_metadata_cid = NULL
WHERE sbt_token_id IS NULL OR sbt_mint_tx_hash IS NULL OR sbt_metadata_cid IS NULL;

