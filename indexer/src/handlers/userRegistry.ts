import { supabase, storeEvent } from '../database'
import { logger } from '../logger'

const ROLE_MAP = ['NONE', 'CLIENT', 'SELLER', 'ADMIN']
const KYC_STATUS_MAP = ['NONE', 'PENDING', 'APPROVED', 'REJECTED']

/**
 * Handle UserRegistered event
 */
export async function handleUserRegistered(
  user: string,
  role: number,
  name: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user, role: ROLE_MAP[role], name },
    'Processing UserRegistered event'
  )

  // Store raw event
  await storeEvent(
    'UserRegistered',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user, role, name }
  )

  // Upsert user
  const { error } = await supabase
    .from('users')
    .upsert({
      wallet_address: user.toLowerCase(),
      role: ROLE_MAP[role] || 'BUYER',
      name: name,
      kyc_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'wallet_address',
      ignoreDuplicates: false,
    })

  if (error) {
    logger.error({ error, user }, 'Failed to upsert user')
    throw error
  }

  logger.info({ user, role: ROLE_MAP[role] }, 'User registered successfully')
}

/**
 * Handle KYCSubmitted event
 */
export async function handleKYCSubmitted(
  user: string,
  documentHash: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user, documentHash },
    'Processing KYCSubmitted event'
  )

  // Store raw event
  await storeEvent(
    'KYCSubmitted',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user, documentHash }
  )

  // Update user KYC status
  const { error } = await supabase
    .from('users')
    .update({
      kyc_status: 'SUBMITTED',
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (error) {
    logger.error({ error, user }, 'Failed to update KYC status')
    throw error
  }

  logger.info({ user }, 'KYC submitted successfully')
}

/**
 * Handle KYCApproved event
 */
export async function handleKYCApproved(
  user: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user },
    'Processing KYCApproved event'
  )

  // Store raw event
  await storeEvent(
    'KYCApproved',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user }
  )

  // Update user KYC status
  const { error: userError } = await supabase
    .from('users')
    .update({
      kyc_status: 'APPROVED',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (userError) {
    logger.error({ error: userError, user }, 'Failed to update user KYC status')
    throw userError
  }

  // Update KYC document status
  const { error: docError } = await supabase
    .from('kyc_documents')
    .update({
      status: 'APPROVED',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())
    .eq('status', 'PENDING')

  if (docError) {
    logger.warn({ error: docError, user }, 'Failed to update KYC document status')
  }

  logger.info({ user }, 'KYC approved successfully')
}

/**
 * Handle KYCRejected event
 */
export async function handleKYCRejected(
  user: string,
  reason: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user, reason },
    'Processing KYCRejected event'
  )

  // Store raw event
  await storeEvent(
    'KYCRejected',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user, reason }
  )

  // Update user KYC status
  const { error: userError } = await supabase
    .from('users')
    .update({
      kyc_status: 'REJECTED',
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (userError) {
    logger.error({ error: userError, user }, 'Failed to update user KYC status')
    throw userError
  }

  // Update KYC document status
  const { error: docError } = await supabase
    .from('kyc_documents')
    .update({
      status: 'REJECTED',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())
    .eq('status', 'PENDING')

  if (docError) {
    logger.warn({ error: docError, user }, 'Failed to update KYC document status')
  }

  logger.info({ user, reason }, 'KYC rejected successfully')
}

/**
 * Handle SbtMinted event (Identity SBT)
 */
export async function handleSbtMinted(
  user: string,
  tokenId: bigint,
  metadataURI: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user, tokenId: Number(tokenId) },
    'Processing SbtMinted event'
  )

  // Store raw event
  await storeEvent(
    'SbtMinted',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user, tokenId: Number(tokenId), metadataURI }
  )

  // Update user with SBT info
  const { error: userError } = await supabase
    .from('users')
    .update({
      sbt_token_id: Number(tokenId),
      sbt_metadata_cid: metadataURI,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (userError) {
    logger.error({ error: userError, user }, 'Failed to update user SBT info')
    throw userError
  }

  // Update KYC document with SBT info
  const { error: docError } = await supabase
    .from('kyc_documents')
    .update({
      sbt_token_id: Number(tokenId),
      sbt_metadata_cid: metadataURI,
      sbt_mint_tx_hash: transactionHash,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (docError) {
    logger.warn({ error: docError, user }, 'Failed to update KYC document SBT info')
  }

  logger.info({ user, tokenId: Number(tokenId) }, 'SBT minted successfully')
}

/**
 * Handle ProofSubmitted event (ZK Registry)
 */
export async function handleProofSubmitted(
  user: string,
  proofHash: string,
  provider: string,
  timestamp: bigint,
  submittedBy: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { user, provider },
    'Processing ProofSubmitted event'
  )

  // Store raw event
  await storeEvent(
    'ProofSubmitted',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { user, proofHash, provider, timestamp: timestamp.toString(), submittedBy }
  )

  // Update user with ZK proof info
  const { error: userError } = await supabase
    .from('users')
    .update({
      proof_hash: proofHash,
      proof_tx_hash: transactionHash,
      proof_provider: provider,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (userError) {
    logger.error({ error: userError, user }, 'Failed to update user ZK proof info')
    throw userError
  }

  // Update KYC document with ZK proof info
  const { error: docError } = await supabase
    .from('kyc_documents')
    .update({
      zk_proof_hash: proofHash,
      zk_proof_tx_hash: transactionHash,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', user.toLowerCase())

  if (docError) {
    logger.warn({ error: docError, user }, 'Failed to update KYC document ZK proof info')
  }

  logger.info({ user, provider }, 'ZK proof submitted successfully')
}
