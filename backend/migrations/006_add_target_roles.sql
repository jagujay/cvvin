-- Add target_roles column to user_profiles table
-- This migration adds support for storing user's target job roles

-- Add target_roles column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS target_roles JSONB DEFAULT '[]'::jsonb;

-- Create index for target_roles for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_target_roles 
ON user_profiles USING GIN(target_roles);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.target_roles IS 'Array of target job roles the user is interested in';
