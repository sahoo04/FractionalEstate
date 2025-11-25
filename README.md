# FractionalEstate

Fractional real estate ownership platform on Arbitrum. Buy property shares (ERC-1155), earn rent rewards, and trade on secondary marketplace.

## Overview

FractionalEstate lets you invest in real estate by buying fractional shares of properties. Each property is tokenized as ERC-1155, so you can:

- Buy shares of real estate properties with USDC
- Receive proportional rent distributions to your wallet
- Trade shares on the secondary marketplace
- Manage properties as a ward boy (property manager)

## Current Features

**Smart Contracts:**
- PropertyShare1155: ERC-1155 tokenized property ownership
- RevenueSplitter: Rent distribution with ward boy system
- Marketplace: Trade shares peer-to-peer (fixed price listings)
- UserRegistry: Track KYC verification

**Frontend:**
- Property listing & purchase
- Dashboard (portfolio + claim rewards)
- Marketplace (buy/sell shares)
- Ward boy interface (deposit rent)
- Admin panel

**Backend:**
- Relayer service for automated rent deposits
- USDC stablecoin transactions
- The Graph subgraph for data indexing

## Tech Stack

- **Frontend:** Next.js 14, React 18, TailwindCSS, Wagmi, RainbowKit
- **Contracts:** Solidity 0.8.20, Hardhat, OpenZeppelin
- **Blockchain:** Arbitrum Sepolia
- **Indexing:** The Graph
- **Backend:** Node.js
- **Storage:** IPFS (Pinata)
- **Database:** Supabase (KYC, user data)

## Project Structure

```
contracts/
  - PropertyShare1155.sol      ERC-1155 for property ownership
  - RevenueSplitter.sol        Rent distribution system
  - Marketplace.sol            Trade shares (buy/sell)
  - UserRegistry.sol           KYC tracking
  - scripts/                   Deploy and setup scripts

frontend/
  - app/page.tsx               Home + property listing
  - app/property/[id]/         Buy shares
  - app/dashboard/             Portfolio + claim rewards
  - app/marketplace/           Trade shares
  - app/ward-boy/              Rent deposit interface
  - app/admin/                 Admin controls

relayer-service/               Auto-deposit rent (optional)

subgraph/                      GraphQL indexing

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- Arbitrum Sepolia ETH (for gas)
- RPC URL: https://sepolia-rollup.arbitrum.io/rpc

### Quick Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Create .env in contracts/
cd contracts
cat > .env << EOF
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_wallet_key
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
EOF

# 3. Deploy
npm run deploy:sepolia
npm run setup

# 4. Update addresses everywhere
cd ..
npm run update-addresses

# 5. Run frontend
npm run dev:frontend
```

Visit `http://localhost:3000`

### Manual Setup (If needed)

**Contracts:**
```bash
cd contracts
npm install
npm run compile
npm run deploy:sepolia
npm run setup
```

Check `contracts/deployments.json` for contract addresses.

**Frontend:**
```bash
cd frontend
npm install

# Create .env.local (auto-created by update-addresses)
# Or manually:
cat > .env.local << EOF
NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
EOF

npm run dev
```

**Relayer (Optional):**
```bash
cd relayer-service
npm install

cat > .env << EOF
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=relayer_key
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
REVENUE_SPLITTER_ADDRESS=0x...
INTERVAL_SECONDS=3600
PROPERTIES=[{"tokenId":1,"amount":"1000000000"}]
EOF

npm run build
npm start
```

## Smart Contracts

### PropertyShare1155 (ERC-1155)

Tokenizes properties as shares. Each token ID = one property.

```
Property #1:
  - 1000 total shares
  - 5 USDC per share
  - Owners can buy/trade shares

Property #2:
  - 5000 total shares
  - 2 USDC per share
  - etc...
```

Main functions:
- `createProperty()` - Create new property
- `purchaseShares()` - Buy shares with USDC
- `balanceOf()` - Check how many shares you own

### RevenueSplitter

Distributes rent to shareholders proportionally.

```
Flow:
1. Ward boy deposits net rent (e.g., 10,000 USDC)
   -> Goes to pendingDistribution

2. Admin calls callOutPay()
   -> Deducts 2.5% platform fee
   -> Remaining (9,750 USDC) available to claim

3. Shareholders call claim()
   -> Get proportional share based on holdings
   -> E.g., if you own 10% of shares, you get 975 USDC
```

Main functions:
- `assignPropertyManager()` - Set ward boy for property
- `depositRentByManager()` - Ward boy deposits rent
- `callOutPay()` - Admin triggers payout
- `claim()` - Claim your rewards
- `getClaimableAmount()` - Check pending rewards

### Marketplace

Buy and sell shares peer-to-peer at fixed prices.

```
Seller wants to sell:
1. Creates listing (shares held in contract)
2. Buyer purchases
3. Fee deducted from buyer's USDC
4. Seller gets payment, buyer gets shares
```

Main functions:
- `createListing()` - List shares for sale
- `cancelListing()` - Remove listing
- `purchase()` - Buy shares from listing

## Frontend

**Home Page:** Browse properties, see details, mint shares

**Dashboard:** Track your portfolio, claim rewards

**Marketplace:** View listings, buy/sell shares from other users

**Ward Boy:** Deposit rent collected from properties and inform on major needed imporvements ad repairs

**Admin:** View system stats, simulate rent deposits (testing), revenue maagement and distrubution

## How It Works

### Buying Shares

1. Browse properties on home page
2. Click property → view details
3. Approve USDC (first time only)
4. Enter amount of shares
5. Click "Buy Shares"
6. USDC transfers from your wallet
7. You receive shares (ERC-1155 token)

### Earning Rewards

1. Ward boys deposit rent from real properties
2. Admin triggers payout (deducts platform fee)
3. Go to dashboard
4. Click "Claim" on property
5. Your proportional share of rent goes to wallet

Example:
- Property has 1000 shares
- You own 100 shares (10%)
- 10,000 USDC rent deposited
- After 2.5% fee: 9,750 USDC available
- You can claim: 975 USDC (10% of 9,750)

### Trading Shares

1. Go to marketplace
2. Create listing (specify amount + price per share)
3. Shares locked in contract
4. Buyer purchases → USDC deducted, shares transferred
5. You get USDC (minus 2.5% fee)

Or buy shares from listings created by others.

## Relayer Service

Background service to automatically deposit rent. Optional - you can manually deposit instead.

```bash
# Manual deposit of 1000 USDC for property 1
npm start 1 1000000000

# Auto mode - deposits every hour
npm start
```

## Environment Variables

**Contracts (.env)**
```env
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_key
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
```

**Relayer (.env)**
```env
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=relayer_key
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
REVENUE_SPLITTER_ADDRESS=0x...
```

## Deployment

1. Ensure .env is set in contracts/
2. Run `npm run deploy:sepolia`
3. Copy contract addresses from `contracts/deployments.json`
4. Update frontend `.env.local` with addresses
5. Run `npm run update-addresses` (auto-updates all files)
6. `npm run dev:frontend` to start

## Development

**Test contracts:**
```bash
cd contracts
npm test
```

**Check balances:**
```bash
cd contracts
npx hardhat run scripts/check-user-balance.ts --network arbitrumSepolia
npx hardhat run scripts/check-revenue.ts --network arbitrumSepolia
```

**Local dev:**
```bash
# Terminal 1: Frontend
npm run dev:frontend

# Terminal 2: Contracts (if needed)
cd contracts && npx hardhat node
```

## Security Notes

- Never commit `.env` files
- Only test on Arbitrum Sepolia, never mainnet (without audit)
- Fees: max 10% (enforced in contracts)
- Pull-based distribution (users must claim rewards)
- Review contract interactions before production

## Contributing

Report issues on GitHub with clear description and steps to reproduce.

## License

MIT
