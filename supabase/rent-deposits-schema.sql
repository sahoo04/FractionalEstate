-- Ward Boy Rent Deposits Schema
-- Stores all rent deposit information with bill references on IPFS

-- Main rent deposits table
CREATE TABLE IF NOT EXISTS rent_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property & Ward Boy Info
  property_id BIGINT NOT NULL,
  property_name TEXT NOT NULL,
  ward_boy_address TEXT NOT NULL,
  
  -- Time Period
  deposit_month TEXT NOT NULL, -- "November 2025"
  deposit_date TIMESTAMP DEFAULT NOW(),
  
  -- Financial Details (in USDC cents/6 decimals)
  gross_rent BIGINT NOT NULL,
  repairs BIGINT DEFAULT 0,
  utilities BIGINT DEFAULT 0,
  cleaning BIGINT DEFAULT 0,
  other_expenses BIGINT DEFAULT 0,
  total_miscellaneous BIGINT NOT NULL,
  net_amount BIGINT NOT NULL,
  
  -- Additional Info
  notes TEXT,
  
  -- Bills Storage (IPFS Hashes)
  bills_metadata JSONB, -- Array of {ipfsHash, category, description, fileName}
  summary_ipfs_hash TEXT, -- IPFS hash of complete deposit summary JSON
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  -- Blockchain Transaction
  deposit_tx_hash TEXT, -- Transaction hash when ward boy deposits
  payout_tx_hash TEXT, -- Transaction hash when admin triggers payout
  
  -- Platform Fee Calculation (calculated at approval time)
  platform_fee_bps INTEGER DEFAULT 300, -- 3% = 300 basis points
  platform_fee_amount BIGINT,
  shareholder_amount BIGINT,
  
  -- Approval Details
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rent_deposits_property ON rent_deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_ward_boy ON rent_deposits(ward_boy_address);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_status ON rent_deposits(status);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_month ON rent_deposits(deposit_month);
CREATE INDEX IF NOT EXISTS idx_rent_deposits_created ON rent_deposits(created_at DESC);

-- Individual bill files tracking (optional, for detailed tracking)
CREATE TABLE IF NOT EXISTS rent_deposit_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES rent_deposits(id) ON DELETE CASCADE,
  
  -- File Info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  
  -- IPFS Storage
  ipfs_hash TEXT NOT NULL UNIQUE,
  ipfs_url TEXT NOT NULL,
  
  -- Bill Details
  category TEXT NOT NULL, -- 'electricity', 'water', 'gas', 'repairs', 'cleaning', 'other'
  description TEXT,
  amount BIGINT, -- Amount for this specific bill
  bill_number TEXT,
  bill_date DATE,
  
  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_deposit ON rent_deposit_bills(deposit_id);
CREATE INDEX IF NOT EXISTS idx_bills_category ON rent_deposit_bills(category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rent_deposits_updated_at
  BEFORE UPDATE ON rent_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for pending deposits (for admin dashboard)
CREATE OR REPLACE VIEW pending_deposits AS
SELECT 
  rd.*,
  COUNT(rdb.id) as bill_count
FROM rent_deposits rd
LEFT JOIN rent_deposit_bills rdb ON rd.id = rdb.deposit_id
WHERE rd.status = 'pending'
GROUP BY rd.id
ORDER BY rd.created_at DESC;

-- View for approved deposits history
CREATE OR REPLACE VIEW approved_deposits AS
SELECT 
  rd.*,
  COUNT(rdb.id) as bill_count
FROM rent_deposits rd
LEFT JOIN rent_deposit_bills rdb ON rd.id = rdb.deposit_id
WHERE rd.status = 'approved'
GROUP BY rd.id
ORDER BY rd.approved_at DESC;

-- Row Level Security (RLS) Policies
ALTER TABLE rent_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_deposit_bills ENABLE ROW LEVEL SECURITY;

-- Policy: Ward boys can view their own deposits
CREATE POLICY ward_boy_view_own_deposits ON rent_deposits
  FOR SELECT
  USING (ward_boy_address = current_setting('request.jwt.claim.wallet_address', true));

-- Policy: Ward boys can insert their own deposits
CREATE POLICY ward_boy_insert_deposits ON rent_deposits
  FOR INSERT
  WITH CHECK (ward_boy_address = current_setting('request.jwt.claim.wallet_address', true));

-- Policy: Admins can view all deposits (add admin check logic)
CREATE POLICY admin_view_all_deposits ON rent_deposits
  FOR SELECT
  USING (true); -- TODO: Add admin role check

-- Policy: Admins can update deposits (for approval/rejection)
CREATE POLICY admin_update_deposits ON rent_deposits
  FOR UPDATE
  USING (true); -- TODO: Add admin role check

-- Policy: Ward boys can view their own bills
CREATE POLICY ward_boy_view_own_bills ON rent_deposit_bills
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rent_deposits 
    WHERE id = rent_deposit_bills.deposit_id 
    AND ward_boy_address = current_setting('request.jwt.claim.wallet_address', true)
  ));

-- Policy: Ward boys can insert bills for their deposits
CREATE POLICY ward_boy_insert_bills ON rent_deposit_bills
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM rent_deposits 
    WHERE id = rent_deposit_bills.deposit_id 
    AND ward_boy_address = current_setting('request.jwt.claim.wallet_address', true)
  ));

-- Comments for documentation
COMMENT ON TABLE rent_deposits IS 'Stores ward boy rent deposits with miscellaneous fee breakdowns';
COMMENT ON TABLE rent_deposit_bills IS 'Stores individual bill files uploaded to IPFS';
COMMENT ON COLUMN rent_deposits.bills_metadata IS 'JSON array of bill metadata: [{ipfsHash, category, description, fileName, fileSize, fileType}]';
COMMENT ON COLUMN rent_deposits.summary_ipfs_hash IS 'IPFS hash of complete deposit summary including all details';
COMMENT ON COLUMN rent_deposits.status IS 'pending = awaiting admin approval, approved = admin approved and payout triggered, rejected = admin rejected';
