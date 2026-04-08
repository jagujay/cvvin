-- Fix files table schema by adding missing columns
-- This script adds the missing created_at and updated_at columns to the files table

-- Add created_at column if it doesn't exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column if it doesn't exist  
ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have proper timestamps
UPDATE files SET created_at = upload_date WHERE created_at IS NULL;
UPDATE files SET updated_at = upload_date WHERE updated_at IS NULL;

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_files_updated_at ON files;

-- Create trigger
CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_files_updated_at();

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'files' 
AND column_name IN ('created_at', 'updated_at', 'upload_date')
ORDER BY column_name;
