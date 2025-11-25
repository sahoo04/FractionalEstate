-- Fix doubled shares in portfolio table
-- This happens because both SharesPurchased and TransferSingle events were being processed
-- Run this in Supabase SQL Editor

-- Show current state
SELECT 
  user_wallet,
  token_id,
  shares_owned,
  total_invested
FROM user_portfolios
WHERE user_wallet = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'
ORDER BY token_id;

-- Fix: Halve the shares for the affected wallet
UPDATE user_portfolios
SET 
  shares_owned = shares_owned / 2,
  total_invested = total_invested / 2,
  last_updated = NOW()
WHERE user_wallet = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53';

-- Verify the fix
SELECT 
  user_wallet,
  token_id,
  shares_owned,
  total_invested
FROM user_portfolios
WHERE user_wallet = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'
ORDER BY token_id;
