-- Add count column to proctoring_violations table
ALTER TABLE proctoring_violations 
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1;

-- Update existing rows to have count = 1
UPDATE proctoring_violations 
SET count = 1 
WHERE count IS NULL;

-- Add comment
COMMENT ON COLUMN proctoring_violations.count IS 'Number of times this violation type occurred in the session';










