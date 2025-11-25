-- ============================================================================
-- RENAME EXISTING INDEXER TABLES (if they have different names)
-- Run this ONLY if your tables are named differently
-- ============================================================================

-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%index%'
ORDER BY table_name;

-- If you have 'indexer_checkpoints', rename it to 'indexer_state'
-- ALTER TABLE indexer_checkpoints RENAME TO indexer_state;

-- If you have 'indexer_events', rename it to 'blockchain_events'
-- ALTER TABLE indexer_events RENAME TO blockchain_events;

-- Verify the structure matches what indexer expects
\d indexer_state
\d blockchain_events
