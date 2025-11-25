-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This will create all indexer tables
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
-- DATABASE FUNCTIONS
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

-- Verify tables were created
SELECT 
    'indexer_state' as table_name,
    COUNT(*) as row_count
FROM indexer_state
UNION ALL
SELECT 
    'blockchain_events',
    COUNT(*)
FROM blockchain_events;
