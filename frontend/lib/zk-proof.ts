/**
 * Zero-knowledge proof utilities
 * Generates proof hashes for KYC verification
 */

import { createHash } from "crypto";
import { logger } from "./logger";

export interface ProofInput {
  userId: string;
  walletAddress: string;
  createdAt: string;
  provider: string;
  salt?: string;
}

/**
 * Generate a SHA256 hash for zero-knowledge proof
 * Combines user data with a salt to create a privacy-preserving proof hash
 *
 * @param input - User data and verification details
 * @returns Proof hash as hex string (without 0x prefix)
 */
export function generateProofHash(input: ProofInput): string {
  const {
    userId,
    walletAddress,
    createdAt,
    provider,
    salt = generateRandomSalt(),
  } = input;

  // Normalize wallet address to lowercase
  const normalizedWallet = walletAddress.toLowerCase();

  // Create proof payload
  // Format: userId|wallet|createdAt|provider|salt
  const proofPayload = `${userId}|${normalizedWallet}|${createdAt}|${provider}|${salt}`;

  // Generate SHA256 hash
  const hash = createHash("sha256").update(proofPayload).digest("hex");

  logger.info("Generated proof hash", {
    userId,
    walletAddress: normalizedWallet,
    provider,
    proofHashPrefix: hash.substring(0, 10) + "...",
  });

  return hash;
}

/**
 * Generate a random salt for proof hash
 * This adds entropy and makes proofs unique even for same user data
 *
 * @returns Random 32-byte hex string
 */
export function generateRandomSalt(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex");
}

/**
 * Convert proof hash to bytes32 format for Solidity
 *
 * @param hashHex - Hex string (with or without 0x prefix)
 * @returns bytes32 formatted hash
 */
export function hashToBytes32(hashHex: string): `0x${string}` {
  // Remove 0x prefix if present
  const cleanHash = hashHex.startsWith("0x") ? hashHex.slice(2) : hashHex;

  // Ensure it's exactly 64 hex characters (32 bytes)
  if (cleanHash.length !== 64) {
    throw new Error(
      `Invalid hash length: expected 64 hex chars, got ${cleanHash.length}`
    );
  }

  return `0x${cleanHash}` as `0x${string}`;
}
