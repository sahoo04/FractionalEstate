import { publicClient, CONFIG } from './config'
import { logger } from './logger'
import {
  getIndexerState,
  updateIndexerState,
  deleteEventsAfterBlock,
  checkDatabaseConnection,
} from './database'
import {
  PROPERTY_SHARE_ABI,
  REVENUE_SPLITTER_ABI,
  MARKETPLACE_ABI,
  USER_REGISTRY_ABI,
  IDENTITY_SBT_ABI,
  ZK_REGISTRY_ABI,
} from './abis'
import { encodeEventTopics, decodeEventLog } from 'viem'
import {
  handlePropertyCreated,
  handleSharesPurchased,
  handleTransferSingle,
} from './handlers/propertyShare'
import {
  handleFundsDepositedByManager,
  handlePayoutTriggered,
  handleRewardClaimed,
  handlePropertyManagerAssigned,
} from './handlers/revenueSplitter'
import {
  handleListingCreated,
  handleListingPurchased,
  handleListingCancelled,
} from './handlers/marketplace'
import {
  handleUserRegistered,
  handleKYCSubmitted,
  handleKYCApproved,
  handleKYCRejected,
  handleSbtMinted,
  handleProofSubmitted,
} from './handlers/userRegistry'
import { Address, Block } from 'viem'

interface ContractConfig {
  address: Address
  abi: any
  eventHandlers: Record<string, Function>
}

/**
 * Contract configurations with event handlers
 */
const CONTRACTS: ContractConfig[] = [
  {
    address: CONFIG.contracts.propertyShare,
    abi: PROPERTY_SHARE_ABI,
    eventHandlers: {
      PropertyCreated: handlePropertyCreated,
      SharesPurchased: handleSharesPurchased,
      TransferSingle: handleTransferSingle,
    },
  },
  {
    address: CONFIG.contracts.revenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    eventHandlers: {
      FundsDepositedByManager: handleFundsDepositedByManager,
      PayoutTriggered: handlePayoutTriggered,
      RewardClaimed: handleRewardClaimed,
      PropertyManagerAssigned: handlePropertyManagerAssigned,
    },
  },
  {
    address: CONFIG.contracts.marketplace,
    abi: MARKETPLACE_ABI,
    eventHandlers: {
      ListingCreated: handleListingCreated,
      PurchaseExecuted: handleListingPurchased,
      ListingCancelled: handleListingCancelled,
    },
  },
  {
    address: CONFIG.contracts.userRegistry,
    abi: USER_REGISTRY_ABI,
    eventHandlers: {
      UserRegistered: handleUserRegistered,
      KYCSubmitted: handleKYCSubmitted,
      KYCApproved: handleKYCApproved,
      KYCRejected: handleKYCRejected,
    },
  },
  {
    address: CONFIG.contracts.identitySBT,
    abi: IDENTITY_SBT_ABI,
    eventHandlers: {
      SbtMinted: handleSbtMinted,
    },
  },
  {
    address: CONFIG.contracts.zkRegistry,
    abi: ZK_REGISTRY_ABI,
    eventHandlers: {
      ProofSubmitted: handleProofSubmitted,
    },
  },
]

/**
 * Main indexer class
 */
export class BlockchainIndexer {
  private isRunning = false
  private pollTimer?: NodeJS.Timeout

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Indexer is already running')
      return
    }

    logger.info('Starting blockchain indexer...')

    // Check database connection
    const dbConnected = await checkDatabaseConnection()
    if (!dbConnected) {
      throw new Error('Database connection failed')
    }

    this.isRunning = true

    // Start polling loop
    await this.poll()
  }

  /**
   * Stop the indexer
   */
  async stop(): Promise<void> {
    logger.info('Stopping blockchain indexer...')
    this.isRunning = false

    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
    }

    logger.info('Indexer stopped')
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    try {
      await this.processBlocks()
    } catch (error) {
      logger.error({ error }, 'Error processing blocks')
    }

    // Schedule next poll
    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), CONFIG.pollInterval)
    }
  }

  /**
   * Process new blocks
   */
  private async processBlocks(): Promise<void> {
    try {
    // Get latest block number
    const latestBlock = await publicClient.getBlockNumber()
    
    logger.debug({ latestBlock: Number(latestBlock) }, 'Latest block on chain')

      // Process each contract (continue even if one fails)
    for (const contract of CONTRACTS) {
        try {
      await this.processContract(contract, latestBlock)
        } catch (error) {
          logger.error(
            { error, contractAddress: contract.address },
            'Error processing contract - continuing with next contract'
          )
          // Continue processing other contracts
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error in processBlocks')
      throw error
    }
  }

  /**
   * Process a single contract
   */
  private async processContract(
    contract: ContractConfig,
    latestBlock: bigint
  ): Promise<void> {
    const { address, abi, eventHandlers } = contract

    // Get indexer state
    const state = await getIndexerState(address)

    let fromBlock: bigint
    let checkpoint: { block: number; hash: string } | undefined

    if (!state) {
      // First time indexing - use smart start block
      fromBlock = await this.getSmartStartBlock(address)
      logger.info({ address, fromBlock: Number(fromBlock) }, 'Starting indexing from smart start block')
    } else {
      fromBlock = BigInt(state.last_processed_block + 1)
      checkpoint = {
        block: state.last_checkpoint_block,
        hash: state.last_checkpoint_hash,
      }

      // Check for reorg
      if (CONFIG.enableReorgProtection && checkpoint) {
        const reorgDetected = await this.detectReorg(checkpoint.block, checkpoint.hash)
        
        if (reorgDetected) {
          logger.warn({ address, checkpointBlock: checkpoint.block }, 'Reorg detected! Rolling back...')
          
          // Rollback to checkpoint
          await deleteEventsAfterBlock(checkpoint.block)
          fromBlock = BigInt(checkpoint.block + 1)
          
          logger.info({ address, newFromBlock: Number(fromBlock) }, 'Rolled back to checkpoint')
        }
      }
    }

    // Don't process if we're caught up (leave confirmations buffer)
    const confirmedBlock = latestBlock - BigInt(CONFIG.confirmationsRequired)
    if (fromBlock > confirmedBlock) {
      logger.debug({ address, fromBlock: Number(fromBlock), confirmedBlock: Number(confirmedBlock) }, 'Caught up, waiting for confirmations')
      return
    }

    // Limit batch size
    const toBlock = fromBlock + BigInt(CONFIG.batchSize - 1) > confirmedBlock
      ? confirmedBlock
      : fromBlock + BigInt(CONFIG.batchSize - 1)

    logger.info(
      { address, fromBlock: Number(fromBlock), toBlock: Number(toBlock) },
      'Processing blocks'
    )

    // Fetch logs
    const logs = await publicClient.getLogs({
      address,
      fromBlock,
      toBlock,
    })

    logger.info({ address, logsCount: logs.length }, 'Fetched logs')

    // Process each log
    let processedCount = 0
    let errorCount = 0
    
    for (const log of logs) {
      try {
        // Decode event
        const topics = log.topics
        const eventSignature = topics[0]

        // Find matching event in ABI
        const event = abi.find((item: any) => {
          if (item.type !== 'event') return false
          const sig = encodeEventTopics({
            abi: [item],
            eventName: item.name,
          })[0]
          return sig === eventSignature
        })

        if (!event) {
          logger.warn({ eventSignature, contractAddress: address }, 'Unknown event signature')
          continue
        }

        // Decode event args
        const decodedLog = decodeEventLog({
          abi: [event],
          data: log.data,
          topics: log.topics,
        }) as any

        const eventName = event.name
        const handler = eventHandlers[eventName]

        if (!handler) {
          logger.warn({ eventName, contractAddress: address }, 'No handler for event')
          continue
        }

        // Call handler with args
        const args = Object.values(decodedLog.args || {})
        await handler(
          ...args,
          log.blockNumber,
          log.blockHash,
          log.transactionHash,
          log.logIndex,
          address
        )
        
        processedCount++

      } catch (error) {
        errorCount++
        logger.error(
          { 
            error, 
            transactionHash: log.transactionHash, 
            logIndex: log.logIndex,
            contractAddress: address
          },
          'Error processing log - continuing with next log'
        )
        // Continue processing other logs instead of throwing
        // This makes the indexer more resilient
      }
    }
    
    if (errorCount > 0) {
      logger.warn(
        { address, processedCount, errorCount, totalLogs: logs.length },
        'Some logs failed to process'
      )
    }

    // Get block hash for the processed block
    const block = await publicClient.getBlock({ blockNumber: toBlock })

    // Update indexer state
    const newCheckpoint =
      Number(toBlock) % 100 === 0
        ? { block: Number(toBlock), hash: block.hash }
        : checkpoint

    await updateIndexerState(
      address,
      Number(toBlock),
      block.hash,
      newCheckpoint
    )

    logger.info(
      { 
        address, 
        processedBlock: Number(toBlock), 
        logsProcessed: logs.length,
        logsSuccessful: processedCount,
        logsFailed: errorCount
      },
      'Processed block batch'
    )
  }

  /**
   * Get smart start block for first-time indexing
   * 
   * Strategy:
   * 1. If START_BLOCK is explicitly set (> 0), use it (contract deployment block)
   * 2. If START_BLOCK is 0 (default), start from current block (only new events going forward)
   * 
   * This prevents indexing from genesis (block 0) which is inefficient.
   * For historical indexing, set START_BLOCK to contract deployment block.
   */
  private async getSmartStartBlock(contractAddress: string): Promise<bigint> {
    // If START_BLOCK is explicitly set (> 0), use it
    // This means user wants to index from a specific block (usually contract deployment)
    if (CONFIG.startBlock > 0n) {
      logger.info(
        { contractAddress, startBlock: Number(CONFIG.startBlock) },
        'Using configured START_BLOCK (indexing from contract deployment)'
      )
      return CONFIG.startBlock
    }

    // START_BLOCK is 0 (default) - start from current block
    // This means: only index new events going forward, skip historical events
    // This is efficient for new deployments or when you don't need historical data
    try {
      const currentBlock = await publicClient.getBlockNumber()
      // Start from a few blocks back to catch any recent events
      const startBlock = currentBlock > BigInt(10) ? currentBlock - BigInt(10) : currentBlock
      
      logger.info(
        { 
          contractAddress, 
          startBlock: Number(startBlock),
          currentBlock: Number(currentBlock),
          note: 'START_BLOCK=0 means starting from current block (only new events)'
        },
        'Starting from current block (skip historical events)'
      )
      
      return startBlock
    } catch (error) {
      logger.error(
        { error, contractAddress },
        'Error getting current block, falling back to START_BLOCK=0'
      )
      return BigInt(0)
    }
  }

  /**
   * Detect blockchain reorganization
   */
  private async detectReorg(blockNumber: number, expectedHash: string): Promise<boolean> {
    try {
      const block = await publicClient.getBlock({ blockNumber: BigInt(blockNumber) })
      
      if (block.hash !== expectedHash) {
        logger.warn(
          { blockNumber, expectedHash, actualHash: block.hash },
          'Block hash mismatch - reorg detected'
        )
        return true
      }
      
      return false
    } catch (error) {
      logger.error({ error, blockNumber }, 'Error checking for reorg')
      // Assume no reorg on error
      return false
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    latestBlock: number
    contracts: Array<{
      address: string
      lastProcessedBlock: number
      behindBy: number
    }>
  }> {
    const latestBlock = await publicClient.getBlockNumber()

    const contracts = await Promise.all(
      CONTRACTS.map(async (contract) => {
        const state = await getIndexerState(contract.address)
        const lastProcessedBlock = state?.last_processed_block || 0

        return {
          address: contract.address,
          lastProcessedBlock,
          behindBy: Number(latestBlock) - lastProcessedBlock,
        }
      })
    )

    return {
      latestBlock: Number(latestBlock),
      contracts,
    }
  }
}
