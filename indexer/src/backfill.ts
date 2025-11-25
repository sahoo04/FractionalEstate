import { BlockchainIndexer } from './indexer'
import { logger } from './logger'

/**
 * Sync from a specific block (useful for backfilling)
 */
async function backfill() {
  const startBlock = process.argv[2] ? BigInt(process.argv[2]) : undefined

  if (!startBlock) {
    logger.error('Usage: npm run backfill <start_block>')
    process.exit(1)
  }

  logger.info({ startBlock: Number(startBlock) }, 'Starting backfill')

  const indexer = new BlockchainIndexer()

  try {
    // TODO: Implement backfill logic
    logger.info('Backfill completed')
  } catch (error) {
    logger.error({ error }, 'Backfill failed')
    process.exit(1)
  }
}

backfill()
