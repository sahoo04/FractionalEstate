-- Ward Boy Property Mapping Table
-- This stores which ward boy is assigned to which property for faster lookups

CREATE TABLE IF NOT EXISTS ward_boy_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER NOT NULL,
  ward_boy_address TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT, -- Admin address who assigned
  is_active BOOLEAN DEFAULT TRUE,
  removed_at TIMESTAMPTZ,
  removed_by TEXT,
  
  UNIQUE(property_id, ward_boy_address)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ward_boy_mappings_address ON ward_boy_mappings(ward_boy_address) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ward_boy_mappings_property ON ward_boy_mappings(property_id) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE ward_boy_mappings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active mappings
CREATE POLICY "Ward boy mappings are viewable by everyone"
  ON ward_boy_mappings FOR SELECT
  USING (is_active = TRUE);

-- Only authenticated users can insert (admin will do this)
CREATE POLICY "Authenticated users can insert ward boy mappings"
  ON ward_boy_mappings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update (for deactivation)
CREATE POLICY "Authenticated users can update ward boy mappings"
  ON ward_boy_mappings FOR UPDATE
  TO authenticated
  USING (true);

-- View for active ward boy assignments
CREATE OR REPLACE VIEW active_ward_boys AS
SELECT 
  property_id,
  ward_boy_address,
  assigned_at,
  assigned_by
FROM ward_boy_mappings
WHERE is_active = TRUE
ORDER BY property_id, assigned_at DESC;

COMMENT ON TABLE ward_boy_mappings IS 'Tracks ward boy assignments to properties for faster frontend lookups';
COMMENT ON VIEW active_ward_boys IS 'Returns only active ward boy assignments';
