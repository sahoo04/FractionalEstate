import { config } from 'dotenv'
import { createPublicClient, http, Address } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

config()

export const CONFIG = {
  // Blockchain
  rpcUrl: process.env.RPC_URL!,
  chainId: Number(process.env.CHAIN_ID || 421614),
  startBlock: BigInt(process.env.START_BLOCK || 0),
  
  // Contracts
  contracts: {
    propertyShare: process.env.PROPERTY_SHARE_ADDRESS as Address,
    revenueSplitter: process.env.REVENUE_SPLITTER_ADDRESS as Address,
    marketplace: process.env.MARKETPLACE_ADDRESS as Address,
    userRegistry: process.env.USER_REGISTRY_ADDRESS as Address,
    zkRegistry: process.env.ZK_REGISTRY_ADDRESS as Address,
    identitySBT: process.env.IDENTITY_SBT_ADDRESS as Address,
  },
  
  // Database
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  
  // Indexer settings
  pollInterval: Number(process.env.POLL_INTERVAL || 5000),
  batchSize: Number(process.env.BATCH_SIZE || 1000),
  confirmationsRequired: Number(process.env.CONFIRMATIONS_REQUIRED || 3),
  maxReorgDepth: Number(process.env.MAX_REORG_DEPTH || 100),
  enableReorgProtection: process.env.ENABLE_REORG_PROTECTION === 'true',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
}

// Validate configuration
function validateConfig() {
  const required = [
    'RPC_URL',
    'PROPERTY_SHARE_ADDRESS',
    'REVENUE_SPLITTER_ADDRESS',
    'MARKETPLACE_ADDRESS',
    'USER_REGISTRY_ADDRESS',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

validateConfig()

// Create public client for blockchain reads
export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(CONFIG.rpcUrl),
})
