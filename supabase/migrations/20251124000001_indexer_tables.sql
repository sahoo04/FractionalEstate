-- ============================================================================
-- INDEXER-SPECIFIC TABLES
-- Add these to your existing schema migration
-- ============================================================================

-- Indexer state tracking (prevents duplicate processing and handles reorgs)
CREATE TABLE IF NOT EXISTS public.indexer_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_address TEXT NOT NULL UNIQUE,
    
    -- Current processing state
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    last_block_hash TEXT NOT NULL,
    
    -- Checkpoint for reorg detection (updated every 100 blocks)
    last_checkpoint_block BIGINT NOT NULL DEFAULT 0,
    last_checkpoint_hash TEXT NOT NULL DEFAULT '',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT contract_address_lowercase CHECK (contract_address = LOWER(contract_address))
);

CREATE INDEX IF NOT EXISTS idx_indexer_state_contract ON public.indexer_state(contract_address);

-- Raw blockchain events (immutable log of all events)
CREATE TABLE IF NOT EXISTS public.blockchain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_name TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    
    -- Block information
    block_number BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    
    -- Event arguments (JSONB for flexible storage)
    args JSONB NOT NULL,
    
    -- Metadata
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: same event can't be processed twice
    CONSTRAINT unique_event UNIQUE (transaction_hash, log_index),
    CONSTRAINT contract_address_lowercase CHECK (contract_address = LOWER(contract_address))
);

CREATE INDEX IF NOT EXISTS idx_blockchain_events_contract ON public.blockchain_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_name ON public.blockchain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_block ON public.blockchain_events(block_number);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON public.blockchain_events(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_processed ON public.blockchain_events(processed_at DESC);

-- Enable RLS
ALTER TABLE public.indexer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_events ENABLE ROW LEVEL SECURITY;

-- Allow public read (for monitoring dashboards)
CREATE POLICY "Anyone can view indexer state"
    ON public.indexer_state FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view blockchain events"
    ON public.blockchain_events FOR SELECT
    USING (true);

-- ============================================================================
-- DATABASE FUNCTIONS (PostgreSQL stored procedures)
-- ============================================================================

-- Function to decrement available shares
CREATE OR REPLACE FUNCTION decrement_available_shares(
    p_token_id INTEGER,
    p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE properties
    SET available_shares = available_shares - p_amount,
        updated_at = NOW()
    WHERE token_id = p_token_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property with token_id % not found', p_token_id;
    END IF;
    
    -- Check if shares went negative
    IF (SELECT available_shares FROM properties WHERE token_id = p_token_id) < 0 THEN
        RAISE EXCEPTION 'Not enough available shares for token_id %', p_token_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment total claimed for a user
CREATE OR REPLACE FUNCTION increment_total_claimed(
    p_wallet_address TEXT,
    p_token_id INTEGER,
    p_amount TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE user_portfolio
    SET total_claimed = COALESCE(total_claimed::NUMERIC, 0) + p_amount::NUMERIC,
        last_updated = NOW()
    WHERE wallet_address = LOWER(p_wallet_address)
    AND token_id = p_token_id;
    
    IF NOT FOUND THEN
        -- Create portfolio entry if doesn't exist
        INSERT INTO user_portfolio (
            wallet_address,
            token_id,
            shares_owned,
            total_invested,
            total_claimed,
            created_at,
            last_updated
        ) VALUES (
            LOWER(p_wallet_address),
            p_token_id,
            0,
            '0',
            p_amount,
            NOW(),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get total value locked (TVL)
CREATE OR REPLACE FUNCTION get_total_value_locked() 
RETURNS TABLE(
    total_properties BIGINT,
    total_shares_sold BIGINT,
    total_value_usd NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_properties,
        SUM(total_shares - available_shares)::BIGINT as total_shares_sold,
        SUM((total_shares - available_shares) * price_per_share::NUMERIC) as total_value_usd
    FROM properties
    WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_wallet_address TEXT)
RETURNS TABLE(
    total_properties BIGINT,
    total_shares BIGINT,
    total_invested NUMERIC,
    total_claimed NUMERIC,
    pending_rewards NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        SUM(shares_owned)::BIGINT,
        SUM(total_invested::NUMERIC),
        SUM(COALESCE(total_claimed::NUMERIC, 0)),
        0::NUMERIC -- TODO: Calculate pending rewards from RevenueSplitter
    FROM user_portfolio
    WHERE wallet_address = LOWER(p_wallet_address);
END;
$$ LANGUAGE plpgsql;
