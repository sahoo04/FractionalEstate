import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './config'
import { logger } from './logger'

export const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Indexer state tracking table
 * Stores last processed block, checkpoint, and reorg detection
 */
export interface IndexerState {
  id: string
  contract_address: string
  last_processed_block: number
  last_block_hash: string
  last_checkpoint_block: number
  last_checkpoint_hash: string
  created_at: string
  updated_at: string
}

/**
 * Get current indexer state for a contract
 */
export async function getIndexerState(contractAddress: string): Promise<IndexerState | null> {
  const { data, error } = await supabase
    .from('indexer_state')
    .select('*')
    .eq('contract_address', contractAddress.toLowerCase())
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - first time running
      return null
    }
    logger.error({ error, contractAddress }, 'Failed to get indexer state')
    throw error
  }
  
  return data
}

/**
 * Update indexer state
 */
export async function updateIndexerState(
  contractAddress: string,
  blockNumber: number,
  blockHash: string,
  checkpoint?: { block: number; hash: string }
): Promise<void> {
  const now = new Date().toISOString()
  
  const data: any = {
    contract_address: contractAddress.toLowerCase(),
    last_processed_block: blockNumber,
    last_block_hash: blockHash,
    updated_at: now,
  }
  
  if (checkpoint) {
    data.last_checkpoint_block = checkpoint.block
    data.last_checkpoint_hash = checkpoint.hash
  }
  
  const { error } = await supabase
    .from('indexer_state')
    .upsert(data, {
      onConflict: 'contract_address',
    })
  
  if (error) {
    logger.error({ error, contractAddress, blockNumber }, 'Failed to update indexer state')
    throw error
  }
}

/**
 * Delete events after a block (for reorg handling)
 */
export async function deleteEventsAfterBlock(blockNumber: number): Promise<void> {
  logger.warn({ blockNumber }, 'Deleting events after block due to reorg')
  
  // Only delete from blockchain_events table (has block_number column)
  // indexer_state is updated separately in indexer.ts during reorg handling
  // Application tables (user_portfolios, properties, etc.) don't have block_number column
  const tables = [
    'blockchain_events',
  ]
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .gte('block_number', blockNumber)
    
    if (error) {
      logger.error({ error, table, blockNumber }, 'Failed to delete events after block')
      throw error
    }
  }
}

/**
 * Generic event storage
 */
export async function storeEvent(
  eventName: string,
  contractAddress: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  args: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('blockchain_events')
    .insert({
      event_name: eventName,
      contract_address: contractAddress.toLowerCase(),
      block_number: Number(blockNumber),
      block_hash: blockHash,
      transaction_hash: transactionHash,
      log_index: logIndex,
      args: args,
      processed_at: new Date().toISOString(),
    })
  
  if (error) {
    logger.error({ error, eventName, transactionHash }, 'Failed to store event')
    throw error
  }
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('indexer_state').select('count').limit(1)
    
    if (error) {
      logger.error({ error }, 'Database connection check failed')
      return false
    }
    
    return true
  } catch (error) {
    logger.error({ error }, 'Database connection check failed')
    return false
  }
}
