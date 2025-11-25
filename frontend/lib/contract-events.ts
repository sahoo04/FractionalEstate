import { TransactionReceipt, Log, decodeEventLog, PublicClient } from 'viem'
import { PROPERTY_SHARE_1155_ABI } from './contracts'
import { logger } from './logger'

/**
 * Extract tokenId from PropertyCreated event with retry mechanism
 * @param txHash Transaction hash
 * @param publicClient Viem public client
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns tokenId as bigint or null if extraction fails
 */
export async function extractTokenIdWithRetry(
  txHash: string,
  publicClient: PublicClient,
  maxRetries: number = 3
): Promise<bigint | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('🔄 Attempting tokenId extraction', { attempt, maxRetries, txHash })
      
      // Wait progressively longer for logs to be indexed
      if (attempt > 1) {
        const waitTime = 2000 * attempt // 2s, 4s, 6s
        logger.debug('⏳ Waiting for logs to be indexed', { waitTime })
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      // Fetch transaction receipt with logs
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      })
      
      if (!receipt) {
        logger.warn('⚠️ Receipt not found', { attempt })
        continue
      }
      
      // Try to extract tokenId
      const tokenId = extractTokenIdFromReceipt(receipt)
      
      if (tokenId !== null) {
        logger.info('✅ TokenId extracted successfully', { 
          tokenId: tokenId.toString(), 
          attempt 
        })
        return tokenId
      }
      
      logger.warn('⚠️ No tokenId in logs, will retry', { attempt, logsCount: receipt.logs.length })
      
    } catch (error: any) {
      logger.error('❌ Extraction attempt failed', { 
        attempt, 
        error: error.message 
      })
    }
  }
  
  logger.error('❌ Failed to extract tokenId after all retries', { maxRetries })
  return null
}

/**
 * Extract tokenId from PropertyCreated event in transaction receipt
 */
export function extractTokenIdFromReceipt(receipt: TransactionReceipt): bigint | null {
  try {
    logger.debug('🔍 Extracting tokenId from receipt', { 
      logsCount: receipt.logs.length,
      txHash: receipt.transactionHash 
    })
    
    // Find PropertyCreated event in logs
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i]
      try {
        const decoded = decodeEventLog({
          abi: PROPERTY_SHARE_1155_ABI,
          data: log.data,
          topics: log.topics,
        })
        
        logger.debug('📋 Decoded event', { 
          eventName: decoded.eventName, 
          logIndex: i 
        })
        
        // Check if this is PropertyCreated event
        if (decoded.eventName === 'PropertyCreated' && typeof decoded.args === 'object' && decoded.args !== null && !Array.isArray(decoded.args)) {
          // PropertyCreated(uint256 indexed tokenId, string name, ...)
          const args = decoded.args as Record<string, any>
          const tokenId = BigInt(args.tokenId)
          
          logger.info('✅ TokenId extracted successfully', { tokenId: tokenId.toString() })
          return tokenId
        }
      } catch (e) {
        // Skip logs that don't match our ABI - this is normal
        continue
      }
    }
    
    logger.warn('⚠️ No PropertyCreated event found in logs')
    return null
  } catch (error) {
    logger.error('❌ Error extracting tokenId from receipt', error)
    return null
  }
}

/**
 * Extract all PropertyCreated events from receipt
 */
export function extractPropertyCreatedEvents(receipt: TransactionReceipt) {
  const events: Array<{
    tokenId: bigint
    name: string
    location: string
    totalShares: bigint
    pricePerShare: bigint
  }> = []
  
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: PROPERTY_SHARE_1155_ABI,
        data: log.data,
        topics: log.topics,
      })
      
      if (decoded.eventName === 'PropertyCreated' && typeof decoded.args === 'object' && decoded.args !== null && !Array.isArray(decoded.args)) {
        const args = decoded.args as Record<string, any>
        events.push({
          tokenId: BigInt(args.tokenId),
          name: String(args.name),
          location: String(args.location),
          totalShares: BigInt(args.totalShares),
          pricePerShare: BigInt(args.pricePerShare),
        })
      }
    } catch (e) {
      continue
    }
  }
  
  
  return events
}

/**
 * Validate tokenId by checking if it exists on-chain
 * @param tokenId Token ID to validate (as string)
 * @param propertyContract Contract instance
 * @returns true if tokenId is valid and exists on-chain
 */
export async function validateTokenId(
  tokenId: string,
  propertyContract: any
): Promise<boolean> {
  try {
    // Check if tokenId is a reasonable number (not a timestamp)
    const tokenIdNum = BigInt(tokenId)
    if (tokenIdNum > 1000000n) {
      logger.warn('⚠️ TokenId looks like a timestamp', { tokenId })
      return false
    }
    
    // Check if property exists on blockchain
    const property = await propertyContract.read.getProperty([tokenIdNum])
    
    if (property && property.exists) {
      logger.info('✅ TokenId validated on-chain', { tokenId })
      return true
    }
    
    logger.warn('⚠️ Property does not exist on-chain', { tokenId })
    return false
    
  } catch (error: any) {
    logger.error('❌ TokenId validation failed', { tokenId, error: error.message })
    return false
  }
}

/**
 * Get latest tokenId from contract (fallback method)
 * @param propertyContract Contract instance
 * @returns Latest tokenId or null
 */
export async function getLatestTokenId(
  propertyContract: any
): Promise<bigint | null> {
  try {
    const propertyCount = await propertyContract.read.propertyCount()
    logger.info('📊 Latest tokenId from contract', { 
      propertyCount: propertyCount.toString() 
    })
    return propertyCount
  } catch (error: any) {
    logger.error('❌ Failed to get latest tokenId', { error: error.message })
    return null
  }
}
