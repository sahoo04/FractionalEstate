import {
  PropertyCreated,
  TransferSingle,
  TransferBatch,
  SharesMinted,
} from '../generated/PropertyShare1155/PropertyShare1155'
import {
  RentDeposited,
  RewardClaimed,
} from '../generated/RevenueSplitter/RevenueSplitter'
import {
  ListingCreated,
  ListingCancelled,
  PurchaseExecuted,
} from '../generated/Marketplace/Marketplace'
import {
  Property,
  Holder,
  Transfer,
  Deposit,
  Claim,
  Listing,
} from '../generated/schema'
import { BigInt, Bytes } from '@graphprotocol/graph-ts'

// Helper function to get or create holder
function getOrCreateHolder(propertyId: string, holderAddress: string): Holder {
  const holderId = `${propertyId}-${holderAddress}`
  let holder = Holder.load(holderId)
  
  if (holder == null) {
    holder = new Holder(holderId)
    holder.property = propertyId
    holder.address = holderAddress as Bytes
    holder.balance = BigInt.fromI32(0)
    holder.totalClaimed = BigInt.fromI32(0)
  }
  
  return holder
}

// PropertyShare1155 Events
export function handlePropertyCreated(event: PropertyCreated): void {
  let property = new Property(event.params.tokenId.toString())
  property.name = event.params.name
  property.location = event.params.location
  property.totalShares = event.params.totalShares
  property.pricePerShare = event.params.pricePerShare
  property.totalDeposited = BigInt.fromI32(0)
  property.save()
}

export function handleTransferSingle(event: TransferSingle): void {
  let propertyId = event.params.id.toString()
  let property = Property.load(propertyId)
  
  if (property == null) {
    return
  }

  // Update holder balances
  if (event.params.from.toHex() != '0x0000000000000000000000000000000000000000') {
    let fromHolder = getOrCreateHolder(propertyId, event.params.from.toHex())
    fromHolder.balance = fromHolder.balance.minus(event.params.value)
    fromHolder.save()
  }

  if (event.params.to.toHex() != '0x0000000000000000000000000000000000000000') {
    let toHolder = getOrCreateHolder(propertyId, event.params.to.toHex())
    toHolder.balance = toHolder.balance.plus(event.params.value)
    toHolder.save()
  }

  // Create transfer entity
  let transfer = new Transfer(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  )
  transfer.property = propertyId
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.amount = event.params.value
  transfer.timestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash
  transfer.save()
}

export function handleTransferBatch(event: TransferBatch): void {
  // Handle batch transfers (similar to single, but iterate over arrays)
  let ids = event.params.ids
  let values = event.params.values
  
  for (let i = 0; i < ids.length; i++) {
    let propertyId = ids[i].toString()
    let property = Property.load(propertyId)
    
    if (property == null) {
      continue
    }

    // Update holder balances
    if (event.params.from.toHex() != '0x0000000000000000000000000000000000000000') {
      let fromHolder = getOrCreateHolder(propertyId, event.params.from.toHex())
      fromHolder.balance = fromHolder.balance.minus(values[i])
      fromHolder.save()
    }

    if (event.params.to.toHex() != '0x0000000000000000000000000000000000000000') {
      let toHolder = getOrCreateHolder(propertyId, event.params.to.toHex())
      toHolder.balance = toHolder.balance.plus(values[i])
      toHolder.save()
    }

    // Create transfer entity
    let transfer = new Transfer(
      event.transaction.hash.toHex() + '-' + i.toString() + '-' + event.logIndex.toString()
    )
    transfer.property = propertyId
    transfer.from = event.params.from
    transfer.to = event.params.to
    transfer.amount = values[i]
    transfer.timestamp = event.block.timestamp
    transfer.transactionHash = event.transaction.hash
    transfer.save()
  }
}

export function handleSharesMinted(event: SharesMinted): void {
  // Shares minted event - holder balance already updated in TransferSingle
  // This can be used for additional tracking if needed
}

// RevenueSplitter Events
export function handleRentDeposited(event: RentDeposited): void {
  let propertyId = event.params.tokenId.toString()
  let property = Property.load(propertyId)
  
  if (property == null) {
    return
  }

  // Update total deposited
  property.totalDeposited = property.totalDeposited.plus(event.params.netAmount)
  property.save()

  // Create deposit entity
  let deposit = new Deposit(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  )
  deposit.property = propertyId
  deposit.amount = event.params.amount
  deposit.feeAmount = event.params.feeAmount
  deposit.netAmount = event.params.netAmount
  deposit.timestamp = event.block.timestamp
  deposit.transactionHash = event.transaction.hash
  deposit.save()
}

export function handleRewardClaimed(event: RewardClaimed): void {
  let propertyId = event.params.tokenId.toString()
  let property = Property.load(propertyId)
  
  if (property == null) {
    return
  }

  let holderId = `${propertyId}-${event.params.holder.toHex()}`
  let holder = Holder.load(holderId)
  
  if (holder == null) {
    holder = getOrCreateHolder(propertyId, event.params.holder.toHex())
  }

  // Update total claimed
  holder.totalClaimed = holder.totalClaimed.plus(event.params.amount)
  holder.save()

  // Create claim entity
  let claim = new Claim(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  )
  claim.property = propertyId
  claim.holder = holderId
  claim.amount = event.params.amount
  claim.timestamp = event.block.timestamp
  claim.transactionHash = event.transaction.hash
  claim.save()
}

// Marketplace Events
export function handleListingCreated(event: ListingCreated): void {
  let propertyId = event.params.tokenId.toString()
  let property = Property.load(propertyId)
  
  if (property == null) {
    return
  }

  let listing = new Listing(event.params.listingId.toString())
  listing.property = propertyId
  listing.seller = event.params.seller
  listing.amount = event.params.amount
  listing.pricePerShare = event.params.pricePerShare
  listing.active = true
  listing.createdAt = event.block.timestamp
  listing.transactionHash = event.transaction.hash
  listing.save()
}

export function handleListingCancelled(event: ListingCancelled): void {
  let listing = Listing.load(event.params.listingId.toString())
  
  if (listing == null) {
    return
  }

  listing.active = false
  listing.cancelledAt = event.block.timestamp
  listing.save()
}

export function handlePurchaseExecuted(event: PurchaseExecuted): void {
  let listing = Listing.load(event.params.listingId.toString())
  
  if (listing == null) {
    return
  }

  listing.active = false
  listing.purchasedAt = event.block.timestamp
  listing.buyer = event.params.buyer
  listing.save()
}

