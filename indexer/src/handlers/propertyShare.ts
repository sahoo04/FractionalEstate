import { supabase, storeEvent } from '../database'
import { logger } from '../logger'
import { formatUnits } from 'viem'

/**
 * Handle PropertyCreated event
 */
export async function handlePropertyCreated(
  tokenId: bigint,
  name: string,
  location: string,
  totalShares: bigint,
  pricePerShare: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), name, location },
    'Processing PropertyCreated event'
  )

  // Store raw event
  await storeEvent(
    'PropertyCreated',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { tokenId: Number(tokenId), name, location, totalShares: totalShares.toString(), pricePerShare: pricePerShare.toString() }
  )

  // Upsert property in database
  const { error } = await supabase
    .from('properties')
    .upsert({
      token_id: Number(tokenId),
      contract_address: contractAddress.toLowerCase(),
      name,
      location,
      total_shares: Number(totalShares),
      available_shares: Number(totalShares),
      price_per_share: formatUnits(pricePerShare, 6), // USDC has 6 decimals
      status: 'active',
      creation_tx_hash: transactionHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'token_id',
    })

  if (error) {
    logger.error({ error, tokenId: Number(tokenId) }, 'Failed to upsert property')
    throw error
  }

  logger.info({ tokenId: Number(tokenId), name }, 'Property created successfully')
}

/**
 * Handle SharesPurchased event
 */
export async function handleSharesPurchased(
  tokenId: bigint,
  buyer: string,
  amount: bigint,
  totalPrice: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { tokenId: Number(tokenId), buyer, amount: Number(amount) },
    'Processing SharesPurchased event'
  )

  // Store raw event
  await storeEvent(
    'SharesPurchased',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { tokenId: Number(tokenId), buyer, amount: amount.toString(), totalPrice: totalPrice.toString() }
  )

  // Update available shares
  const { error: updateError } = await supabase.rpc('decrement_available_shares', {
    p_token_id: Number(tokenId),
    p_amount: Number(amount),
  })

  if (updateError) {
    logger.error({ error: updateError, tokenId: Number(tokenId) }, 'Failed to update available shares')
    throw updateError
  }

  // Portfolio updates are handled directly by the frontend API
  // Commenting out indexer portfolio updates to prevent double-counting
  /*
  // Update or create user portfolio entry
  const { data: existing } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', buyer.toLowerCase())
    .eq('token_id', Number(tokenId))
    .single()

  const pricePerShare = formatUnits(totalPrice / amount, 6)
  const investmentAmount = formatUnits(totalPrice, 6)

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('user_portfolios')
      .update({
        shares_owned: Number(existing.shares_owned) + Number(amount),
        total_invested: (parseFloat(existing.total_invested) + parseFloat(investmentAmount)).toString(),
        last_updated: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      logger.error({ error, buyer }, 'Failed to update user portfolio')
      throw error
    }
  } else {
    // Create new
    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('token_id', Number(tokenId))
      .single()

    const { error } = await supabase
      .from('user_portfolios')
      .insert({
        user_wallet: buyer.toLowerCase(),
        token_id: Number(tokenId),
        property_name: property?.name || `Property #${tokenId}`,
        shares_owned: Number(amount),
        total_invested: investmentAmount,
        purchase_price_per_share: pricePerShare,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })

    if (error) {
      logger.error({ error, buyer }, 'Failed to create user portfolio entry')
      throw error
    }
  }
  */

  logger.info({ tokenId: Number(tokenId), buyer, amount: Number(amount) }, 'Shares purchased successfully')
}

/**
 * Handle TransferSingle event (for marketplace and other transfers)
 */
export async function handleTransferSingle(
  operator: string,
  from: string,
  to: string,
  tokenId: bigint,
  value: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  // Skip mint and burn events (handled by SharesPurchased)
  // Mint events (from ZERO_ADDRESS) are already handled by SharesPurchased event
  // Only process secondary market transfers (non-zero from and to)
  if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
    return
  }

  // Additional check: Skip if this is a purchase transaction (will be handled by SharesPurchased)
  // Purchase transactions have operator = buyer address and from = ZERO_ADDRESS (already filtered above)
  // This handles only secondary market transfers where both from and to are non-zero

  logger.info(
    { tokenId: Number(tokenId), from, to, value: Number(value) },
    'Processing TransferSingle event'
  )

  // Store raw event
  await storeEvent(
    'TransferSingle',
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    { operator, from, to, tokenId: Number(tokenId), value: value.toString() }
  )

  // Portfolio updates are handled directly by the frontend API
  // Commenting out indexer portfolio updates to prevent double-counting
  /*
  // Update sender portfolio (decrease)
  await updatePortfolioBalance(from, Number(tokenId), -Number(value))

  // Update receiver portfolio (increase)
  await updatePortfolioBalance(to, Number(tokenId), Number(value))
  */

  logger.info({ tokenId: Number(tokenId), from, to, value: Number(value) }, 'Transfer processed successfully')
}

/**
 * Helper: Update portfolio balance
 */
async function updatePortfolioBalance(wallet: string, tokenId: number, deltaShares: number) {
  const { data: existing } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', wallet.toLowerCase())
    .eq('token_id', tokenId)
    .single()

  if (existing) {
    const newShares = Number(existing.shares_owned) + deltaShares

    if (newShares <= 0) {
      // Delete if no shares left
      await supabase
        .from('user_portfolios')
        .delete()
        .eq('id', existing.id)
    } else {
      // Update shares
      await supabase
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }
  } else if (deltaShares > 0) {
    // Create new entry for receiver
    const { data: property } = await supabase
      .from('properties')
      .select('name, price_per_share')
      .eq('token_id', tokenId)
      .single()

    await supabase
      .from('user_portfolios')
      .insert({
        user_wallet: wallet.toLowerCase(),
        token_id: tokenId,
        property_name: property?.name || `Property #${tokenId}`,
        shares_owned: deltaShares,
        total_invested: '0',
        purchase_price_per_share: property?.price_per_share || '0',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
  }
}
