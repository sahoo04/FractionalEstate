-- FractionalStay Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('NONE', 'CLIENT', 'SELLER', 'ADMIN');
CREATE TYPE kyc_status_enum AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE property_type AS ENUM ('APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL');
CREATE TYPE property_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'DELISTED');
CREATE TYPE transaction_type AS ENUM ('MINT', 'TRANSFER', 'PURCHASE', 'RENT_DEPOSIT', 'CLAIM');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE document_type AS ENUM ('PASSPORT', 'ID_CARD', 'DRIVER_LICENSE', 'BUSINESS_CERT');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'NONE',
    kyc_status kyc_status_enum NOT NULL DEFAULT 'NONE',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    business_name TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create indexes for users
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

-- =============================================
-- PROPERTIES TABLE
-- =============================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id BIGINT NOT NULL UNIQUE,
    seller_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipcode TEXT NOT NULL,
    description TEXT NOT NULL,
    property_type property_type NOT NULL,
    total_shares BIGINT NOT NULL,
    price_per_share DECIMAL(20, 6) NOT NULL,
    images TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    metadata_uri TEXT NOT NULL,
    listing_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status property_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for properties
CREATE INDEX idx_properties_token_id ON properties(token_id);
CREATE INDEX idx_properties_seller ON properties(seller_wallet);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash TEXT NOT NULL UNIQUE,
    type transaction_type NOT NULL,
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    token_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    price DECIMAL(20, 6),
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_from ON transactions(from_wallet);
CREATE INDEX idx_transactions_to ON transactions(to_wallet);
CREATE INDEX idx_transactions_token_id ON transactions(token_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);

-- =============================================
-- KYC DOCUMENTS TABLE
-- =============================================
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_hash TEXT NOT NULL,
    status kyc_status_enum NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
);

-- Create indexes for kyc_documents
CREATE INDEX idx_kyc_user ON kyc_documents(user_wallet);
CREATE INDEX idx_kyc_status ON kyc_documents(status);

-- =============================================
-- USER PORTFOLIOS TABLE
-- =============================================
CREATE TABLE user_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    token_id BIGINT NOT NULL,
    property_name TEXT NOT NULL,
    shares_owned BIGINT NOT NULL,
    total_invested DECIMAL(20, 6) NOT NULL,
    total_rewards_claimed DECIMAL(20, 6) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_wallet, token_id)
);

-- Create indexes for user_portfolios
CREATE INDEX idx_portfolio_user ON user_portfolios(user_wallet);
CREATE INDEX idx_portfolio_token_id ON user_portfolios(token_id);

-- =============================================
-- MARKETPLACE LISTINGS TABLE
-- =============================================
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id BIGINT NOT NULL UNIQUE,
    seller_wallet TEXT NOT NULL,
    token_id BIGINT NOT NULL,
    property_name TEXT NOT NULL,
    shares_amount BIGINT NOT NULL,
    price_per_share DECIMAL(20, 6) NOT NULL,
    total_price DECIMAL(20, 6) NOT NULL,
    status property_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for marketplace_listings
CREATE INDEX idx_listings_listing_id ON marketplace_listings(listing_id);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_wallet);
CREATE INDEX idx_listings_token_id ON marketplace_listings(token_id);
CREATE INDEX idx_listings_status ON marketplace_listings(status);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to properties table
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to marketplace_listings table
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Users: Can read all, update own profile
CREATE POLICY "Users can view all profiles"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Properties: All can read active properties
CREATE POLICY "Anyone can view active properties"
    ON properties FOR SELECT
    USING (status = 'ACTIVE' OR status = 'SOLD');

CREATE POLICY "Sellers can create properties"
    ON properties FOR INSERT
    WITH CHECK (seller_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Transactions: Users can view their own transactions
CREATE POLICY "Users can view their transactions"
    ON transactions FOR SELECT
    USING (
        from_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR to_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- KYC: Users can view own documents
CREATE POLICY "Users can view own KYC"
    ON kyc_documents FOR SELECT
    USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Portfolios: Users can view own portfolio
CREATE POLICY "Users can view own portfolio"
    ON user_portfolios FOR SELECT
    USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Marketplace: All can view active listings
CREATE POLICY "Anyone can view active listings"
    ON marketplace_listings FOR SELECT
    USING (status = 'ACTIVE');

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample admin user
INSERT INTO users (wallet_address, role, kyc_status, name, email) VALUES
('0x9643646d5D31d69ad3A47aE4E023f07333b2b746', 'ADMIN', 'APPROVED', 'Platform Admin', 'admin@fractionalstay.com');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables: users, properties, transactions, kyc_documents, user_portfolios, marketplace_listings';
    RAISE NOTICE 'Admin user created: 0x9643646d5D31d69ad3A47aE4E023f07333b2b746';
END $$;
