#!/bin/bash

# FractionalStay Indexer Setup Script

echo "🚀 FractionalStay Blockchain Indexer Setup"
echo "=========================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Navigate to indexer directory
cd "$(dirname "$0")"
echo "📂 Working directory: $(pwd)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Try to auto-fill contract addresses from deployments.json
    DEPLOYMENTS_FILE="../contracts/deployments.json"
    if [ -f "$DEPLOYMENTS_FILE" ]; then
        echo "🔍 Found deployments.json, auto-filling contract addresses..."
        
        PROPERTY_SHARE=$(node -p "require('$DEPLOYMENTS_FILE').contracts.PropertyShare1155")
        REVENUE_SPLITTER=$(node -p "require('$DEPLOYMENTS_FILE').contracts.RevenueSplitter")
        MARKETPLACE=$(node -p "require('$DEPLOYMENTS_FILE').contracts.Marketplace")
        USER_REGISTRY=$(node -p "require('$DEPLOYMENTS_FILE').contracts.UserRegistry || '0x0000000000000000000000000000000000000000'")
        ZK_REGISTRY=$(node -p "require('$DEPLOYMENTS_FILE').contracts.ZKRegistry || '0x0000000000000000000000000000000000000000'")
        IDENTITY_SBT=$(node -p "require('$DEPLOYMENTS_FILE').contracts.IdentitySBT || '0x0000000000000000000000000000000000000000'")
        
        sed -i.bak "s|PROPERTY_SHARE_ADDRESS=.*|PROPERTY_SHARE_ADDRESS=$PROPERTY_SHARE|" .env
        sed -i.bak "s|REVENUE_SPLITTER_ADDRESS=.*|REVENUE_SPLITTER_ADDRESS=$REVENUE_SPLITTER|" .env
        sed -i.bak "s|MARKETPLACE_ADDRESS=.*|MARKETPLACE_ADDRESS=$MARKETPLACE|" .env
        sed -i.bak "s|USER_REGISTRY_ADDRESS=.*|USER_REGISTRY_ADDRESS=$USER_REGISTRY|" .env
        sed -i.bak "s|ZK_REGISTRY_ADDRESS=.*|ZK_REGISTRY_ADDRESS=$ZK_REGISTRY|" .env
        sed -i.bak "s|IDENTITY_SBT_ADDRESS=.*|IDENTITY_SBT_ADDRESS=$IDENTITY_SBT|" .env
        
        rm .env.bak
        echo "✅ Contract addresses auto-filled"
    else
        echo "⚠️  deployments.json not found, you'll need to fill contract addresses manually"
    fi
    
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "   Get these from: https://supabase.com → Your Project → Settings → API"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"
echo ""

# Run health check
echo "🏥 Running health check..."
npm run health
if [ $? -ne 0 ]; then
    echo "⚠️  Health check failed. Please check your configuration."
    echo ""
    echo "Common issues:"
    echo "  1. Supabase credentials not set in .env"
    echo "  2. Database migration not run (see supabase/migrations/)"
    echo "  3. RPC URL not accessible"
    echo ""
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Make sure Supabase migration is applied:"
echo "     → Run supabase/migrations/20251124000001_indexer_tables.sql"
echo ""
echo "  2. Start the indexer:"
echo "     npm start           (production)"
echo "     npm run dev         (development with auto-reload)"
echo ""
echo "  3. Monitor sync status:"
echo "     npm run health"
echo ""
echo "Happy indexing! 🎉"
