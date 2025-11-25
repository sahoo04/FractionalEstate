-- Fix doubled shares issue
-- This will halve all share counts in user_portfolios table

UPDATE user_portfolios
SET shares_owned = shares_owned / 2,
    total_invested = (total_invested::numeric / 2)::text,
    last_updated = NOW()
WHERE wallet_address = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53';

-- Check the result
SELECT wallet_address, token_id, property_name, shares_owned, total_invested
FROM user_portfolios
WHERE wallet_address = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53';
