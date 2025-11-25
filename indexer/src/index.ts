import { BlockchainIndexer } from './indexer'
import { logger } from './logger'
import { CONFIG } from './config'

/**
 * Main entry point
 */
async function main() {
  logger.info('🚀 FractionalStay Blockchain Indexer')
  logger.info({
    network: 'Arbitrum Sepolia',
    chainId: CONFIG.chainId,
    rpcUrl: CONFIG.rpcUrl,
    contracts: Object.keys(CONFIG.contracts).length,
    pollInterval: CONFIG.pollInterval,
    batchSize: CONFIG.batchSize,
    confirmations: CONFIG.confirmationsRequired,
    reorgProtection: CONFIG.enableReorgProtection,
  }, 'Configuration')

  const indexer = new BlockchainIndexer()

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...')
    await indexer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...')
    await indexer.stop()
    process.exit(0)
  })

  // Start indexer
  try {
    await indexer.start()
    logger.info('✅ Indexer started successfully')

    // Keep process alive
    setInterval(async () => {
      const status = await indexer.getSyncStatus()
      logger.info({ status }, 'Sync status')
    }, 60000) // Log status every minute

  } catch (error) {
    logger.error({ error }, 'Failed to start indexer')
    process.exit(1)
  }
}

// Run
main().catch((error) => {
  logger.error({ error }, 'Fatal error')
  process.exit(1)
})
