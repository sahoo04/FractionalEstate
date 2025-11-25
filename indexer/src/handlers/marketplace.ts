import { supabase, storeEvent } from "../database";
import { logger } from "../logger";
import { formatUnits } from "viem";

/**
 * Handle ListingCreated event
 */
export async function handleListingCreated(
  listingId: bigint,
  seller: string,
  tokenId: bigint,
  amount: bigint,
  pricePerShare: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    {
      listingId: Number(listingId),
      seller,
      tokenId: Number(tokenId),
      amount: Number(amount),
    },
    "Processing ListingCreated event"
  );

  // Store raw event
  await storeEvent(
    "ListingCreated",
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      listingId: Number(listingId),
      seller,
      tokenId: Number(tokenId),
      amount: amount.toString(),
      pricePerShare: pricePerShare.toString(),
    }
  );

  // Get property info
  const { data: property } = await supabase
    .from("properties")
    .select("name")
    .eq("token_id", Number(tokenId))
    .single();

  const totalPrice = pricePerShare * amount;

  // Insert marketplace listing
  const { error } = await supabase.from("marketplace_listings").insert({
    listing_id: Number(listingId),
    token_id: Number(tokenId),
    property_name: property?.name || `Property #${tokenId}`,
    seller_wallet: seller.toLowerCase(),
    shares_amount: Number(amount),
    price_per_share: formatUnits(pricePerShare, 6),
    total_price: formatUnits(totalPrice, 6),
    status: "ACTIVE",
    transaction_hash: transactionHash,
    block_number: Number(blockNumber),
    created_at: new Date().toISOString(),
  });

  if (error) {
    logger.error(
      { error, listingId: Number(listingId) },
      "Failed to insert marketplace listing"
    );
    throw error;
  }

  logger.info(
    { listingId: Number(listingId), seller, amount: Number(amount) },
    "Listing created successfully"
  );
}

/**
 * Handle PurchaseExecuted event (from both purchase and purchasePartial)
 */
export async function handleListingPurchased(
  listingId: bigint,
  buyer: string,
  seller: string,
  tokenId: bigint,
  amount: bigint,
  totalPrice: bigint,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    {
      listingId: Number(listingId),
      buyer,
      tokenId: Number(tokenId),
      amount: Number(amount),
    },
    "Processing PurchaseExecuted event"
  );

  // Store raw event
  await storeEvent(
    "PurchaseExecuted",
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      listingId: Number(listingId),
      buyer,
      seller,
      tokenId: Number(tokenId),
      amount: amount.toString(),
      totalPrice: totalPrice.toString(),
    }
  );

  // Get listing info
  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("listing_id", Number(listingId))
    .single();

  if (!listing) {
    logger.error({ listingId: Number(listingId) }, "Listing not found");
    throw new Error(`Listing ${listingId} not found`);
  }

  // Check if this is a partial purchase
  const purchasedAmount = Number(amount);
  const currentShares = Number(listing.shares_amount);
  const remainingShares = currentShares - purchasedAmount;
  const isFullPurchase = remainingShares === 0;

  // Update listing: reduce shares_amount, mark as SOLD if all shares purchased
  const { error: updateError } = await supabase
    .from("marketplace_listings")
    .update({
      shares_amount: remainingShares,
      status: isFullPurchase ? "SOLD" : "ACTIVE",
      buyer_wallet: isFullPurchase ? buyer.toLowerCase() : listing.buyer_wallet,
      sold_at: isFullPurchase ? new Date().toISOString() : listing.sold_at,
      updated_at: new Date().toISOString(),
    })
    .eq("listing_id", Number(listingId));

  if (updateError) {
    logger.error(
      { error: updateError, listingId: Number(listingId) },
      "Failed to update listing status"
    );
    throw updateError;
  }

  // Insert marketplace transaction
  const { error: txError } = await supabase
    .from("marketplace_transactions")
    .insert({
      listing_id: Number(listingId),
      buyer_wallet: buyer.toLowerCase(),
      seller_wallet: listing.seller_wallet,
      token_id: Number(tokenId),
      shares_amount: Number(amount),
      price_per_share: listing.price_per_share,
      total_price: formatUnits(totalPrice, 6),
      transaction_hash: transactionHash,
      block_number: Number(blockNumber),
      completed_at: new Date().toISOString(),
    });

  if (txError) {
    logger.error(
      { error: txError, listingId: Number(listingId) },
      "Failed to insert marketplace transaction"
    );
    throw txError;
  }

  // Update buyer's portfolio (increase shares)
  await updatePortfolioAfterPurchase(
    buyer,
    Number(tokenId),
    Number(amount),
    formatUnits(totalPrice, 6)
  );

  // Update seller's portfolio (decrease shares - already done by TransferSingle event)

  logger.info(
    { listingId: Number(listingId), buyer, amount: Number(amount) },
    "Listing purchased successfully"
  );
}

/**
 * Handle ListingCancelled event
 */
export async function handleListingCancelled(
  listingId: bigint,
  seller: string,
  blockNumber: bigint,
  blockHash: string,
  transactionHash: string,
  logIndex: number,
  contractAddress: string
) {
  logger.info(
    { listingId: Number(listingId), seller },
    "Processing ListingCancelled event"
  );

  // Store raw event
  await storeEvent(
    "ListingCancelled",
    contractAddress,
    blockNumber,
    blockHash,
    transactionHash,
    logIndex,
    {
      listingId: Number(listingId),
      seller,
    }
  );

  // Update listing status to CANCELLED
  const { error } = await supabase
    .from("marketplace_listings")
    .update({
      status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("listing_id", Number(listingId));

  if (error) {
    logger.error(
      { error, listingId: Number(listingId) },
      "Failed to update listing status"
    );
    throw error;
  }

  logger.info(
    { listingId: Number(listingId), seller },
    "Listing cancelled successfully"
  );
}

/**
 * Helper: Update buyer's portfolio after marketplace purchase
 */
async function updatePortfolioAfterPurchase(
  buyer: string,
  tokenId: number,
  shares: number,
  totalPrice: string
) {
  const { data: existing } = await supabase
    .from("user_portfolios")
    .select("*")
    .eq("wallet_address", buyer.toLowerCase())
    .eq("token_id", tokenId)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("user_portfolios")
      .update({
        shares_owned: Number(existing.shares_owned) + shares,
        total_invested: (
          parseFloat(existing.total_invested) + parseFloat(totalPrice)
        ).toString(),
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      logger.error({ error, buyer }, "Failed to update buyer portfolio");
      throw error;
    }
  } else {
    // Create new
    const { data: property } = await supabase
      .from("properties")
      .select("name, price_per_share")
      .eq("token_id", tokenId)
      .single();

    const { error } = await supabase.from("user_portfolios").insert({
      wallet_address: buyer.toLowerCase(),
      token_id: tokenId,
      property_name: property?.name || `Property #${tokenId}`,
      shares_owned: shares,
      total_invested: totalPrice,
      purchase_price_per_share: property?.price_per_share || "0",
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    });

    if (error) {
      logger.error({ error, buyer }, "Failed to create buyer portfolio entry");
      throw error;
    }
  }
}
