-- Add purpose column to otps table with default value
ALTER TABLE otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'verification';

-- Add index for the purpose column
CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose);