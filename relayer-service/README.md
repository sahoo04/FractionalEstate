# FractionalStay Relayer Service

Service for simulating rent collection and depositing USDC to the RevenueSplitter contract.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_here
USDC_ADDRESS=0x...
REVENUE_SPLITTER_ADDRESS=0x...
INTERVAL_SECONDS=3600  # Optional: auto-simulate every hour (0 = manual only)
PROPERTIES=[{"tokenId":1,"amount":1000}]  # Optional: properties to auto-simulate
```

3. Build:
```bash
npm run build
```

## Usage

### Manual Mode
Deposit rent for a specific property:
```bash
npm start <tokenId> <amount>
# Example: npm start 1 1000
```

### Auto Mode
Set `INTERVAL_SECONDS` in `.env` to enable automatic rent simulation.

Run:
```bash
npm start
```

The service will deposit rent for all properties in the `PROPERTIES` array every `INTERVAL_SECONDS`.







