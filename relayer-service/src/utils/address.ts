import { ethers } from 'ethers'
import logger from '../logger'

/**
 * Validates and checksums an Ethereum address
 * @param address - Address to validate and checksum
 * @param name - Name of the address for error logging
 * @returns Checksummed address
 * @throws Error if address is invalid
 */
export function validateAndChecksumAddress(address: string, name: string): string {
  if (!address || address === '') {
    const error = new Error(`Missing ${name} address`)
    logger.error(`Missing ${name} address`, error, { address, name })
    throw error
  }

  try {
    // Validate and checksum address
    const checksummed = ethers.getAddress(address)
    
    // Log if address was changed (lowercase to checksummed)
    if (address !== checksummed) {
      logger.debug(`Checksummed ${name} address`, { 
        original: address, 
        checksummed,
        name 
      })
    }

    return checksummed
  } catch (error) {
    logger.error(`Invalid ${name} address format`, error as Error, { address, name })
    throw new Error(`Invalid ${name} address: ${address}`)
  }
}

