/**
 * Contract ABIs for event listening
 * Only includes events we need to index
 */

export const PROPERTY_SHARE_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'location', type: 'string' },
      { indexed: false, name: 'totalShares', type: 'uint256' },
      { indexed: false, name: 'pricePerShare', type: 'uint256' },
    ],
    name: 'PropertyCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalPrice', type: 'uint256' },
    ],
    name: 'SharesPurchased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'operator', type: 'address' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'ids', type: 'uint256[]' },
      { indexed: false, name: 'values', type: 'uint256[]' },
    ],
    name: 'TransferBatch',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'operator', type: 'address' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'id', type: 'uint256' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'TransferSingle',
    type: 'event',
  },
] as const

export const REVENUE_SPLITTER_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'manager', type: 'address' },
      { indexed: false, name: 'netAmount', type: 'uint256' },
      { indexed: false, name: 'grossRent', type: 'uint256' },
      { indexed: false, name: 'miscellaneousFee', type: 'uint256' },
    ],
    name: 'FundsDepositedByManager',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'grossAmount', type: 'uint256' },
      { indexed: false, name: 'platformFee', type: 'uint256' },
      { indexed: false, name: 'netForDistribution', type: 'uint256' },
    ],
    name: 'PayoutTriggered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'holder', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'RewardClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'manager', type: 'address' },
    ],
    name: 'PropertyManagerAssigned',
    type: 'event',
  },
] as const

export const MARKETPLACE_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'pricePerShare', type: 'uint256' },
    ],
    name: 'ListingCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalPrice', type: 'uint256' },
    ],
    name: 'PurchaseExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
    ],
    name: 'ListingCancelled',
    type: 'event',
  },
] as const

export const USER_REGISTRY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'role', type: 'uint8' },
      { indexed: false, name: 'name', type: 'string' },
    ],
    name: 'UserRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'documentHash', type: 'string' },
    ],
    name: 'KYCSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
    ],
    name: 'KYCApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
    name: 'KYCRejected',
    type: 'event',
  },
] as const

export const IDENTITY_SBT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'metadataURI', type: 'string' },
    ],
    name: 'SbtMinted',
    type: 'event',
  },
] as const

export const ZK_REGISTRY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'proofHash', type: 'bytes32' },
      { indexed: false, name: 'provider', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: true, name: 'submittedBy', type: 'address' },
    ],
    name: 'ProofSubmitted',
    type: 'event',
  },
] as const
