import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import logger from './logger'

dotenv.config()

// Contract ABIs (minimal for USDC and RevenueSplitter)
const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
]

const REVENUE_SPLITTER_ABI = [
  'function depositRent(uint256 tokenId, uint256 amount)',
  'function totalDeposited(uint256 tokenId) view returns (uint256)',
]

interface Config {
  rpcUrl: string
  privateKey: string
  usdcAddress: string
  revenueSplitterAddress: string
  intervalSeconds?: number
}

class RentRelayer {
  private provider: ethers.Provider
  private wallet: ethers.Wallet
  private usdc: ethers.Contract
  private revenueSplitter: ethers.Contract
  private intervalSeconds: number
  private intervalId?: NodeJS.Timeout

  constructor(config: Config) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl)
    this.wallet = new ethers.Wallet(config.privateKey, this.provider)
    
    // Validate and checksum addresses
    try {
      const usdcAddress = ethers.getAddress(config.usdcAddress)
      const revenueSplitterAddress = ethers.getAddress(config.revenueSplitterAddress)
      
      this.usdc = new ethers.Contract(usdcAddress, USDC_ABI, this.wallet)
      this.revenueSplitter = new ethers.Contract(
        revenueSplitterAddress,
        REVENUE_SPLITTER_ABI,
        this.wallet
      )
      
      logger.info('Relayer initialized', {
        walletAddress: this.wallet.address,
        usdcAddress,
        revenueSplitterAddress,
      })
    } catch (error) {
      logger.error('Invalid contract addresses', error, {
        usdcAddress: config.usdcAddress,
        revenueSplitterAddress: config.revenueSplitterAddress,
      })
      throw error
    }
    
    this.intervalSeconds = config.intervalSeconds || 0
  }

  /**
   * Simulate rent collection and deposit to RevenueSplitter
   * @param tokenId Property token ID
   * @param amount Amount in USDC (6 decimals)
   */
  async simulateRent(tokenId: number, amount: number): Promise<void> {
    try {
      logger.info('Simulating rent deposit', { tokenId, amount })

      // Check USDC balance
      const balance = await this.usdc.balanceOf(this.wallet.address)
      const balanceFormatted = Number(balance) / 1e6
      logger.debug('USDC balance checked', { 
        balance: balanceFormatted,
        walletAddress: this.wallet.address 
      })

      if (balanceFormatted < amount) {
        const error = new Error(`Insufficient USDC balance. Need ${amount}, have ${balanceFormatted.toFixed(2)}`)
        logger.error('Insufficient USDC balance', error, {
          required: amount,
          available: balanceFormatted,
          tokenId,
        })
        throw error
      }

      // Convert amount to USDC (6 decimals)
      const amountWei = ethers.parseUnits(amount.toString(), 6)

      // Approve RevenueSplitter to spend USDC
      logger.info('Approving USDC', { 
        spender: await this.revenueSplitter.getAddress(),
        amount: amountWei.toString() 
      })
      const approveTx = await this.usdc.approve(await this.revenueSplitter.getAddress(), amountWei)
      const approveReceipt = await approveTx.wait()
      logger.info('USDC approval confirmed', { 
        txHash: approveTx.hash,
        blockNumber: approveReceipt?.blockNumber 
      })

      // Deposit rent
      logger.info('Depositing rent to RevenueSplitter', { tokenId, amountWei: amountWei.toString() })
      const depositTx = await this.revenueSplitter.depositRent(tokenId, amountWei)
      logger.info('Rent deposit transaction sent', { txHash: depositTx.hash })

      const receipt = await depositTx.wait()
      logger.info('Rent deposit transaction confirmed', {
        txHash: depositTx.hash,
        blockNumber: receipt?.blockNumber,
        tokenId,
      })

      // Check total deposited
      const totalDeposited = await this.revenueSplitter.totalDeposited(tokenId)
      const totalDepositedFormatted = Number(totalDeposited) / 1e6
      logger.info('Rent deposit successful', {
        tokenId,
        amount,
        totalDeposited: totalDepositedFormatted,
      })
    } catch (error) {
      logger.error('Error depositing rent', error as Error, { tokenId, amount })
      throw error
    }
  }

  /**
   * Start automatic rent simulation (runs every intervalSeconds)
   * @param properties Array of { tokenId, amount } objects
   */
  startAutoSimulation(properties: Array<{ tokenId: number; amount: number }>): void {
    if (this.intervalSeconds <= 0) {
      logger.info('Auto-simulation disabled', { intervalSeconds: this.intervalSeconds })
      return
    }

    logger.info('Starting auto-simulation', {
      intervalSeconds: this.intervalSeconds,
      properties,
    })

    this.intervalId = setInterval(async () => {
      for (const property of properties) {
        try {
          await this.simulateRent(property.tokenId, property.amount)
        } catch (error) {
          logger.error(`Failed to deposit rent for property ${property.tokenId}`, error as Error, {
            tokenId: property.tokenId,
            amount: property.amount,
          })
        }
      }
    }, this.intervalSeconds * 1000)
  }

  /**
   * Stop automatic rent simulation
   */
  stopAutoSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
      logger.info('Auto-simulation stopped')
    }
  }
}

// Main execution
async function main() {
  const config: Config = {
    rpcUrl: process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    privateKey: process.env.PRIVATE_KEY || '',
    usdcAddress: process.env.USDC_ADDRESS || '',
    revenueSplitterAddress: process.env.REVENUE_SPLITTER_ADDRESS || '',
    intervalSeconds: process.env.INTERVAL_SECONDS ? parseInt(process.env.INTERVAL_SECONDS) : 0,
  }

  // Validate config
  if (!config.privateKey) {
    const error = new Error('PRIVATE_KEY environment variable is required')
    logger.error('Configuration error', error)
    throw error
  }
  if (!config.usdcAddress) {
    const error = new Error('USDC_ADDRESS environment variable is required')
    logger.error('Configuration error', error)
    throw error
  }
  if (!config.revenueSplitterAddress) {
    const error = new Error('REVENUE_SPLITTER_ADDRESS environment variable is required')
    logger.error('Configuration error', error)
    throw error
  }

  // Validate addresses are valid
  try {
    ethers.getAddress(config.usdcAddress)
    ethers.getAddress(config.revenueSplitterAddress)
  } catch (error) {
    logger.error('Invalid address format in configuration', error as Error, {
      usdcAddress: config.usdcAddress,
      revenueSplitterAddress: config.revenueSplitterAddress,
    })
    throw error
  }

  const relayer = new RentRelayer(config)

  // Check if running in manual mode or auto mode
  const args = process.argv.slice(2)

  if (args.length >= 2) {
    // Manual mode: node dist/index.js <tokenId> <amount>
    const tokenId = parseInt(args[0])
    const amount = parseFloat(args[1])

    if (isNaN(tokenId) || isNaN(amount)) {
      logger.error('Invalid command line arguments', undefined, { args })
      console.error('Usage: npm start <tokenId> <amount>')
      process.exit(1)
    }

    await relayer.simulateRent(tokenId, amount)
    process.exit(0)
  } else {
    // Auto mode: use environment variables
    const properties = process.env.PROPERTIES
      ? JSON.parse(process.env.PROPERTIES)
      : [{ tokenId: 1, amount: 1000 }] // Default: property 1, $1000 USDC

    if ((config.intervalSeconds ?? 0) > 0) {
      relayer.startAutoSimulation(properties)

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully')
        relayer.stopAutoSimulation()
        process.exit(0)
      })
    } else {
      // Run once
      for (const property of properties) {
        await relayer.simulateRent(property.tokenId, property.amount)
      }
      process.exit(0)
    }
  }
}

main().catch((error) => {
  logger.error('Fatal error in main', error as Error)
  process.exit(1)
})


