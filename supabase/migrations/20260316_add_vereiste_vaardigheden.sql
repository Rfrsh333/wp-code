-- Add vereiste_vaardigheden column to diensten table
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS vereiste_vaardigheden JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_diensten_vaardigheden ON diensten USING GIN (vereiste_vaardigheden);

COMMENT ON COLUMN diensten.vereiste_vaardigheden IS 'Required skills for this shift as JSON array of strings';
