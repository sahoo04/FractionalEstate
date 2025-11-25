-- =====================================================
-- FRACTIONAL ESTATE - WARD BOY SYSTEM DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor
-- This creates tables for ward boy assignments and rent deposits

-- =====================================================
-- 0. DROP EXISTING VIEWS AND TABLES (Clean Slate)
-- =====================================================
-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS pending_deposits CASCADE;
DROP VIEW IF EXISTS active_ward_boys CASCADE;
DROP VIEW IF EXISTS approved_deposits CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_ward_boy_mappings_updated_at ON ward_boy_mappings;
DROP TRIGGER IF EXISTS update_rent_deposits_updated_at ON rent_deposits;

-- Drop tables
DROP TABLE IF EXISTS rent_deposit_bills CASCADE;
DROP TABLE IF EXISTS rent_deposits CASCADE;
DROP TABLE IF EXISTS ward_boy_mappings CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =====================================================
-- 1. WARD BOY MAPPINGS TABLE
-- =====================================================
-- Tracks which ward boy is assigned to which property

CREATE TABLE IF NOT EXISTS ward_boy_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER NOT NULL UNIQUE, -- One ward boy per property
  ward_boy_address TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT, -- Admin address who assigned
  is_active BOOLEAN DEFAULT TRUE,
  removed_at TIMESTAMPTZ,
  removed_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ward_boy_mappings_address ON ward_boy_mappings(ward_boy_address) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ward_boy_mappings_property ON ward_boy_mappings(property_id) WHERE is_active = TRUE;

-- RLS Policies (Simple - anyone can read, authenticated can write)
ALTER TABLE ward_boy_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ward boy mappings" ON ward_boy_mappings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ward boy mappings" ON ward_boy_mappings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update ward boy mappings" ON ward_boy_mappings
  FOR UPDATE USING (true);

-- =====================================================
-- 2. RENT DEPOSITS TABLE
-- =====================================================
-- Stores all rent deposit submissions with bill metadata

CREATE TABLE IF NOT EXISTS rent_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property & Ward Boy Info
  property_id INTEGER NOT NULL,
  property_name TEXT NOT NULL,
  ward_boy_address TEXT NOT NULL,
  
  -- Time Period
  deposit_month TEXT NOT NULL,
  
  -- Financial Details (stored as strings to match USDC formatting)
  gross_rent TEXT NOT NULL,
  repairs TEXT DEFAULT '0',
  utilities TEXT DEFAULT '0',
  cleaning TEXT DEFAULT '0',
  other_expenses TEXT DEFAULT '0',
  total_miscellaneous TEXT NOT NULL,
  net_amount TEXT NOT NULL,
  
  -- Additional Info
  notes TEXT,
  
  -- Bills Storage (IPFS)
  bills_metadata JSONB, -- [{ipfsHash, fileName, fileSize, fileType}]
  summary_ipfs_hash TEXT, -- IPFS hash of complete deposit summary
  
  -- Status & Transactions
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  deposit_tx_hash TEXT,
  payout_tx_hash TEXT,
  
  -- Approval Details
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_deposits_property ON rent_deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_ward_boy ON rent_deposits(ward_boy_address);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_status ON rent_deposits(status);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_created ON rent_deposits(created_at DESC);

-- RLS Policies
ALTER TABLE rent_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rent deposits" ON rent_deposits
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert rent deposits" ON rent_deposits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rent deposits" ON rent_deposits
  FOR UPDATE USING (true);

-- =====================================================
-- 3. HELPER VIEWS
-- =====================================================

-- View for active ward boy assignments
CREATE OR REPLACE VIEW active_ward_boys AS
SELECT 
  property_id,
  ward_boy_address,
  assigned_at,
  assigned_by
FROM ward_boy_mappings
WHERE is_active = TRUE
ORDER BY property_id;

-- View for pending deposits (admin dashboard)
CREATE OR REPLACE VIEW pending_deposits AS
SELECT *
FROM rent_deposits
WHERE status = 'pending'
ORDER BY created_at DESC;

-- =====================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ward_boy_mappings_updated_at
  BEFORE UPDATE ON ward_boy_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_deposits_updated_at
  BEFORE UPDATE ON rent_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE! 
-- =====================================================
-- You can now:
-- 1. Assign ward boys via admin panel
-- 2. Ward boys can submit rent deposits
-- 3. Admins can approve/reject deposits
-- 4. All data syncs with blockchain transactions
-- =====================================================
