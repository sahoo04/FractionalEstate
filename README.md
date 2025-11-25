# FractionalStay 🏠

> Democratizing Real Estate Investment Through Blockchain

FractionalStay is a decentralized platform that makes real estate investment accessible to everyone. Instead of needing crores to buy property, you can now invest in premium properties starting from just ₹10,000. Own fractional shares as ERC-1155 tokens, earn monthly rental income, and trade your shares on our secondary marketplace—all powered by blockchain for transparency and security.

## 🎯 The Problem

Real estate has always been one of the best investment options, but it's been out of reach for most people. You need millions to buy property outright, and even if you have the money, managing properties is a hassle. Traditional real estate investment trusts (REITs) exist, but they're centralized, lack transparency, and have high entry barriers.

We wanted to change that. What if anyone could invest in a luxury villa or commercial property with just ₹10,000? What if all transactions were transparent and recorded on-chain? What if you could trade your property shares like stocks?

## ✨ What We Built

FractionalStay is a complete Web3 platform for fractional real estate ownership. Here's what makes it special:

### For Investors
- **Low Entry Barrier**: Start investing with just ₹10,000
- **Passive Income**: Earn monthly rent proportional to your ownership
- **Liquidity**: Trade your shares anytime on our P2P marketplace
- **Transparency**: All transactions on blockchain, no hidden fees
- **Privacy**: KYC with zero-knowledge proofs—your data stays private

### For Property Owners
- **Easy Listing**: Upload property details, set share price, and get funded
- **Automated Management**: Assign ward boys to handle rent collection
- **IPFS Storage**: All documents and metadata stored on decentralized storage
- **Transparent Operations**: Every transaction visible on-chain

### For Property Managers (Ward Boys)
- **Dedicated Dashboard**: Manage multiple properties from one place
- **Rent Collection**: Track deposits, expenses, and net revenue
- **Bill Management**: Upload receipts and bills to IPFS
- **Automated Payouts**: Admin approves → investors claim their share

## 🏗️ Architecture

We built a full-stack decentralized application with multiple components working together:

```
┌─────────────────┐
│   Next.js App   │  ← User-facing frontend
│  (Wagmi/Rainbow)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Supabase│ │Blockchain│
│Database│ │ Indexer  │  ← Syncs on-chain events to DB
└───┬───┘ └──────────┘
    │
┌───▼──────────────┐
│  Smart Contracts │  ← 8 contracts on Arbitrum
│  (Arbitrum L2)   │
└──────────────────┘
```

### Tech Stack

**Blockchain Layer**
- **Network**: Arbitrum Sepolia (L2 for low gas costs)
- **Smart Contracts**: 8 Solidity contracts using OpenZeppelin
- **Token Standard**: ERC-1155 for fractional ownership
- **Identity**: Soulbound Tokens (SBT) for KYC verification

**Frontend**
- **Framework**: Next.js 14 with App Router
- **Web3**: Wagmi v2 + RainbowKit for wallet connections
- **UI**: Tailwind CSS + Headless UI
- **State**: Zustand for client state, React Query for server state

**Backend & Infrastructure**
- **Database**: Supabase (PostgreSQL) for off-chain data
- **Storage**: IPFS via Pinata for documents and metadata
- **Indexer**: Custom TypeScript service with reorg protection
- **Deployment**: Vercel for frontend, self-hosted for indexer

## 📁 Project Structure

```
FractionalEstate/
├── contracts/          # Smart contracts (Hardhat)
│   ├── contracts/      # 8 Solidity contracts
│   ├── scripts/        # Deployment & migration scripts
│   └── test/          # Contract tests
├── frontend/          # Next.js web application
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities & contract ABIs
│   └── contexts/      # React contexts
├── indexer/           # Blockchain event indexer
│   └── src/           # TypeScript indexer service
├── relayer-service/   # Rent distribution automation
└── supabase/          # Database migrations
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask or any Web3 wallet
- Arbitrum Sepolia ETH (for gas)
- Supabase account (free tier works)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd FractionalEstate
npm install
cd contracts && npm install
cd ../frontend && npm install
cd ../indexer && npm install
```

2. **Deploy smart contracts**
```bash
cd contracts
cp .env.example .env
# Add your ARBITRUM_SEPOLIA_RPC_URL and PRIVATE_KEY
npm run deploy:sepolia
```

3. **Setup Supabase database**
- Create a project at [supabase.com](https://supabase.com)
- Run migrations from `supabase/migrations/` in SQL Editor
- Copy your project URL and API keys

4. **Configure frontend**
```bash
cd frontend
cp .env.example .env.local
# Add contract addresses, Supabase keys, WalletConnect ID
npm run dev
```

5. **Start the indexer** (optional, for real-time sync)
```bash
cd indexer
cp .env.example .env
# Add RPC URL, contract addresses, Supabase keys
npm run build
npm start
```

Visit `http://localhost:3000` and connect your wallet!

## 🔐 Smart Contracts

All contracts are deployed on **Arbitrum Sepolia**:

| Contract | Purpose |
|----------|---------|
| `PropertyShare1155` | ERC-1155 tokens representing property shares |
| `RevenueSplitter` | Handles rent distribution with admin approval |
| `Marketplace` | P2P trading of property shares |
| `UserRegistry` | Role management (Buyer/Seller/Admin) |
| `ZKRegistry` | Stores zero-knowledge proof hashes |
| `IdentitySBT` | Soulbound tokens for verified users |
| `Governance` | DAO voting (future feature) |
| `MockUSDC` | Testnet USDC with faucet |

Contract addresses are in `contracts/deployments.json`. All contracts are verified on Arbiscan.

## 💡 Key Features

### 1. Multi-Role System
Separate dashboards for different user types:
- **Investors**: Browse properties, buy shares, track portfolio, claim rewards
- **Sellers**: List properties, manage listings, track funding
- **Admins**: Approve KYC, trigger payouts, assign ward boys
- **Ward Boys**: Deposit rent, manage expenses, upload bills

### 2. Two-Step Rent Distribution
Our revenue flow prevents errors and fraud:
1. Ward boy deposits net rent → goes to "pending" pool
2. Admin reviews and approves → moves to "claimable" pool
3. Investors claim their share anytime

This two-step process ensures transparency and prevents mistakes.

### 3. Privacy-Preserving KYC
We use zero-knowledge proofs for KYC:
- Users submit documents (stored on IPFS)
- ZK proof is generated and stored on-chain
- Soulbound token (SBT) is minted upon approval
- Verification data stays private, only approval status is public

### 4. Secondary Marketplace
Investors can list their shares for sale at any price. Buyers purchase with USDC. The marketplace takes a 2.5% fee on trades, split between platform and protocol.

### 5. Real-Time Portfolio Tracking
Dashboard shows:
- Total investments across all properties
- Current portfolio value
- Claimable rewards (ready to claim)
- Pending rewards (awaiting admin approval)
- Monthly yield and ROI

### 6. IPFS Integration
All property metadata, images, and documents are stored on IPFS via Pinata. Only the IPFS hash is stored on-chain, saving gas costs while maintaining decentralization.

## 🔄 How It Works

### Investment Flow
1. User connects wallet and completes KYC
2. Browses available properties on the marketplace
3. Buys shares using USDC (approves USDC first if needed)
4. Receives ERC-1155 tokens representing ownership
5. Earns monthly rent proportional to ownership percentage
6. Can trade shares on secondary marketplace anytime

### Revenue Distribution Flow
1. Ward boy collects rent from tenants
2. Deducts expenses (maintenance, utilities, repairs)
3. Deposits net amount to `RevenueSplitter` contract
4. Admin reviews deposit and triggers payout
5. Revenue is split: 3% platform fee, 97% to shareholders
6. Investors claim their share from the contract

### Example Calculation
Property generates ₹50,000/month rent:
- Expenses: ₹5,000 (maintenance, utilities)
- Net deposit: ₹45,000
- Platform fee (3%): ₹1,350
- Available for shareholders: ₹43,650

If you own 10% of shares: ₹4,365 that month.

## 🗄️ Database Schema

We use Supabase (PostgreSQL) for off-chain data to improve UX:

**Core Tables:**
- `users` - User profiles, roles, KYC status, SBT tokens
- `properties` - Property listings with full metadata
- `user_portfolios` - Investment holdings per user
- `marketplace_listings` - Active sell orders
- `marketplace_transactions` - Trade history
- `rent_deposits` - Revenue tracking with approval workflow
- `ward_boys` - Property manager assignments

**Indexer Tables:**
- `indexer_state` - Sync progress per contract
- `blockchain_events` - Immutable event log

The blockchain indexer keeps the database in sync with on-chain events. Blockchain is the source of truth; the database is a materialized view for fast queries.

## 🧪 Testing

```bash
cd contracts
npm test
```

We have comprehensive tests for all smart contract functions including:
- Property creation and share minting
- Revenue distribution and claiming
- Marketplace listing and purchasing
- KYC and SBT minting
- Edge cases and error handling

## 🔧 Development

### Running Locally

**Frontend:**
```bash
cd frontend
npm run dev
```

**Indexer:**
```bash
cd indexer
npm run build
npm start
```

**Contracts:**
```bash
cd contracts
npx hardhat node  # Local testnet
npx hardhat test  # Run tests
```

### Environment Variables

See `.env.example` files in each directory for required variables. Key ones:
- `ARBITRUM_SEPOLIA_RPC_URL` - RPC endpoint
- `PRIVATE_KEY` - Deployer wallet (never commit!)
- `PINATA_JWT` - IPFS upload token
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` - Database credentials
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Indexer (Self-hosted)
Deploy to any Node.js hosting (Railway, Render, etc.):
```bash
cd indexer
npm run build
npm start
```

### Smart Contracts
Already deployed on Arbitrum Sepolia. For mainnet:
1. Get contracts audited
2. Update RPC URLs and deploy
3. Verify on Arbiscan
4. Update frontend with new addresses

## 📊 Project Stats

- **Smart Contracts**: 8 deployed on Arbitrum Sepolia
- **Lines of Code**: 18,000+
- **Database Tables**: 12
- **Frontend Components**: 50+
- **API Routes**: 30+
- **Test Coverage**: Comprehensive contract tests

## 🎓 What We Learned

Building FractionalStay taught us a lot:

- **ERC-1155 is perfect for fractional ownership** - Multi-token standard makes it easy to represent different properties
- **Two-step payouts prevent issues** - Admin approval step catches mistakes before distribution
- **ZK proofs + SBTs make KYC privacy-friendly** - Users stay anonymous while being verified
- **Blockchain indexers need reorg protection** - Can't trust finality on L2s, need checkpoint system
- **Database as materialized view** - Blockchain is truth, DB is for speed
- **Pull-based claims save gas** - Users claim when ready vs. pushing to everyone
- **Ward boy system scales** - Property managers handle real-world operations

## 🔮 Future Roadmap

- [ ] Governance voting UI for DAO features
- [ ] Mobile app (React Native)
- [ ] Property appreciation tracking
- [ ] Email notifications for rent deposits
- [ ] Multi-chain support (Polygon, Base)
- [ ] Advanced analytics dashboard
- [ ] Automated rent collection via oracles
- [ ] Insurance integration for properties

## ⚠️ Security Notes

This is a hackathon project. Before mainnet deployment:

- [ ] Professional smart contract audit
- [ ] Rate limiting on all API endpoints
- [ ] 2FA for high-value transactions
- [ ] Monitoring and alerting system
- [ ] Emergency pause mechanism
- [ ] Comprehensive security review

**Never commit private keys or secrets!**

## 📝 License

MIT License - feel free to use this for your own projects.

## 👥 Team

Built during a hackathon with lots of coffee ☕ and late-night coding sessions.

---

**Live Demo**: [Add your Vercel/deployment URL here]  
**Contract Addresses**: See `contracts/deployments.json`  
**Documentation**: Check individual README files in each directory

**Questions?** Open an issue or reach out!
