-- Create marketplace_transactions table for tracking completed trades
-- This table stores the history of all completed marketplace purchases

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id BIGINT NOT NULL,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  token_id BIGINT NOT NULL,
  shares_amount BIGINT NOT NULL,
  price_per_share TEXT NOT NULL,
  total_price TEXT NOT NULL,
  transaction_hash TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON marketplace_transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON marketplace_transactions(seller_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_token_id ON marketplace_transactions(token_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_completed_at ON marketplace_transactions(completed_at);

-- Add comment
COMMENT ON TABLE marketplace_transactions IS 'Stores history of completed marketplace trades for analytics and user history';
