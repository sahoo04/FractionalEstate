import { supabase, storeEvent } from '../database'
import { logger } from '../logger'
import { formatUnits } from 'viem'

/**
 * Handle FundsDepositedByManager event
 */
export async function handleFundsDepositedByManager(
  tokenId: bigint,
  manager: string,
  netAmount: bigint,
  grossRent: bigint,
  miscellaneousFee: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), manager, netAmount: formatUnits(netAmount, 6) },
    'Processing FundsDepositedByManager event'
  )

  // Store raw event
  await storeEvent(
    'FundsDepositedByManager',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      tokenId: Number(tokenId),
      manager,
      netAmount: netAmount.toString(),
      grossRent: grossRent.toString(),
      miscellaneousFee: miscellaneousFee.toString(),
    }
  )

  // Insert rent deposit record
  const { error } = await supabase
    .from('rent_deposits')
    .insert({
      token_id: Number(tokenId),
      depositor_wallet: manager.toLowerCase(),
      gross_rent: formatUnits(grossRent, 6),
      miscellaneous_fee: formatUnits(miscellaneousFee, 6),
      net_amount: formatUnits(netAmount, 6),
      deposit_type: 'WARD_BOY',
      status: 'PENDING',
      transaction_hash: transactionHash,
      block_number: Number(blockNumber),
      deposited_at: new Date().toISOString(),
    })

  if (error) {
    logger.error({ error, tokenId: Number(tokenId) }, 'Failed to insert rent deposit')
    throw error
  }

  logger.info({ tokenId: Number(tokenId), netAmount: formatUnits(netAmount, 6) }, 'Rent deposited successfully')
}

/**
 * Handle PayoutTriggered event
 */
export async function handlePayoutTriggered(
  tokenId: bigint,
  grossAmount: bigint,
  platformFee: bigint,
  netForDistribution: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), netForDistribution: formatUnits(netForDistribution, 6) },
    'Processing PayoutTriggered event'
  )

  // Store raw event
  await storeEvent(
    'PayoutTriggered',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      tokenId: Number(tokenId),
      grossAmount: grossAmount.toString(),
      platformFee: platformFee.toString(),
      netForDistribution: netForDistribution.toString(),
    }
  )

  // Update most recent pending deposit to DISTRIBUTED
  const { error } = await supabase
    .from('rent_deposits')
    .update({
      status: 'DISTRIBUTED',
      platform_fee: formatUnits(platformFee, 6),
      distributable_amount: formatUnits(netForDistribution, 6),
      distributed_at: new Date().toISOString(),
    })
    .eq('token_id', Number(tokenId))
    .eq('status', 'PENDING')
    .order('deposited_at', { ascending: false })
    .limit(1)

  if (error) {
    logger.error({ error, tokenId: Number(tokenId) }, 'Failed to update rent deposit status')
    throw error
  }

  logger.info({ tokenId: Number(tokenId), netForDistribution: formatUnits(netForDistribution, 6) }, 'Payout triggered successfully')
}

/**
 * Handle RewardClaimed event
 */
export async function handleRewardClaimed(
  tokenId: bigint,
  holder: string,
  amount: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), holder, amount: formatUnits(amount, 6) },
    'Processing RewardClaimed event'
  )

  // Store raw event
  await storeEvent(
    'RewardClaimed',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      tokenId: Number(tokenId),
      holder,
      amount: amount.toString(),
    }
  )

  // Insert reward claim record
  const { error: insertError } = await supabase
    .from('reward_claims')
    .insert({
      token_id: Number(tokenId),
      claimer_wallet: holder.toLowerCase(),
      amount_claimed: formatUnits(amount, 6),
      transaction_hash: transactionHash,
      block_number: Number(blockNumber),
      claimed_at: new Date().toISOString(),
    })

  if (insertError) {
    logger.error({ error: insertError, tokenId: Number(tokenId), holder }, 'Failed to insert reward claim')
    throw insertError
  }

  // Update user portfolio total claimed
  const { error: updateError } = await supabase.rpc('increment_total_claimed', {
    p_wallet_address: holder.toLowerCase(),
    p_token_id: Number(tokenId),
    p_amount: formatUnits(amount, 6),
  })

  if (updateError) {
    logger.error({ error: updateError, holder }, 'Failed to update total claimed')
    throw updateError
  }

  logger.info({ tokenId: Number(tokenId), holder, amount: formatUnits(amount, 6) }, 'Reward claimed successfully')
}

/**
 * Handle PropertyManagerAssigned event
 */
export async function handlePropertyManagerAssigned(
  tokenId: bigint,
  manager: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), manager },
    'Processing PropertyManagerAssigned event'
  )

  // Store raw event
  await storeEvent(
    'PropertyManagerAssigned',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      tokenId: Number(tokenId),
      manager,
    }
  )

  // Deactivate previous ward boys for this property
  await supabase
    .from('ward_boys')
    .update({ active: false })
    .eq('token_id', Number(tokenId))

  // Insert new ward boy assignment
  const { error } = await supabase
    .from('ward_boys')
    .insert({
      token_id: Number(tokenId),
      manager_wallet: manager.toLowerCase(),
      assigned_at: new Date().toISOString(),
      active: true,
    })

  if (error) {
    logger.error({ error, tokenId: Number(tokenId), manager }, 'Failed to assign ward boy')
    throw error
  }

  logger.info({ tokenId: Number(tokenId), manager }, 'Property manager assigned successfully')
}
