import { BlockchainIndexer } from './indexer'
import { checkDatabaseConnection } from './database'
import { logger } from './logger'

/**
 * Health check script
 */
async function healthCheck() {
  logger.info('Running health check...')

  // Check database
  const dbHealthy = await checkDatabaseConnection()
  if (!dbHealthy) {
    logger.error('❌ Database connection failed')
    process.exit(1)
  }
  logger.info('✅ Database connection OK')

  // Check sync status
  const indexer = new BlockchainIndexer()
  const status = await indexer.getSyncStatus()

  logger.info({ status }, 'Sync status')

  const maxBehind = Math.max(...status.contracts.map(c => c.behindBy))

  if (maxBehind > 1000) {
    logger.warn(`⚠️  Indexer is ${maxBehind} blocks behind`)
  } else {
    logger.info(`✅ Indexer is synced (${maxBehind} blocks behind)`)
  }

  logger.info('Health check complete')
  process.exit(0)
}

healthCheck()
