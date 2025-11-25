-- Seed indexer_state table with correct starting blocks
-- Run this in Supabase SQL Editor after TRUNCATE

-- PropertyShare1155
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0x3809c6480fde57d20522778514dacacb073c96ba',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- RevenueSplitter
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0x9f5cf9bea42fd49c3384a49c0dc2484f8d1ac4b8',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- Marketplace
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0xe3ee63e03e78380e39e73243882da79486044524',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- UserRegistry
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0xf77951f62ed3b92d6c8db131aca2d7b822301ee2',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- IdentitySBT
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0x67905835bed0f5b633ed8ca5b2e2506cf2aff1f7',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- ZkRegistry
INSERT INTO indexer_state (
  contract_address,
  last_processed_block,
  last_block_hash,
  last_checkpoint_block,
  last_checkpoint_hash,
  created_at,
  updated_at
) VALUES (
  '0x4c01b3a4724d85bf5d4913d2bf40cea27b59a7d7',
  87094269,
  '',
  87094269,
  '',
  NOW(),
  NOW()
) ON CONFLICT (contract_address) DO UPDATE SET
  last_processed_block = 87094269,
  last_block_hash = '',
  last_checkpoint_block = 87094269,
  last_checkpoint_hash = '',
  updated_at = NOW();

-- Verify the data
SELECT 
  contract_address,
  last_processed_block,
  last_checkpoint_block
FROM indexer_state
ORDER BY contract_address;
