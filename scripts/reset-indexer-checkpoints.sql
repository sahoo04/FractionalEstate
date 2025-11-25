-- Reset indexer checkpoints to rescan from deployment block
-- This will force the indexer to scan all blocks again

-- Delete all checkpoints (will restart from configured start block)
DELETE FROM indexer_checkpoints;

-- Alternatively, update to specific block if you know the deployment block
-- UPDATE indexer_checkpoints SET last_processed_block = 87094270, last_block_hash = '';

-- Check current state
SELECT * FROM indexer_checkpoints;
