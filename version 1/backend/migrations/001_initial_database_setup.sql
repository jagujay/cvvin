-- CVVIN Platform Database Setup Script
-- Run this script in pgAdmin4 to create the database schema

-- Create database (if it doesn't exist)
-- Note: You may need to create the database manually in pgAdmin4 first
-- Database name: cvvin

-- Connect to the cvvin database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    resume_text TEXT, -- Extracted text for search
    skills JSONB DEFAULT '[]'::jsonb,
    experience_years DECIMAL(3,1),
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create files table with local storage support
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'resume_pdf', 'profile_image', 'document'
    file_size BIGINT NOT NULL,
    file_data BYTEA, -- Binary data for small files (< 10MB)
    file_path TEXT, -- Path for large files stored on filesystem
    storage_method VARCHAR(20) DEFAULT 'database', -- 'database', 'filesystem'
    mime_type VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    checksum VARCHAR(64) -- SHA-256 hash for integrity verification
);

-- Create resume analyses table
CREATE TABLE IF NOT EXISTS resume_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    job_description TEXT NOT NULL,
    analysis_result JSONB NOT NULL, -- Ollama analysis output
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    resume_text TEXT, -- First 1000 chars for reference
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50) DEFAULT 'resume-analyzer-v1'
);

-- Create interview sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'full_mock', 'technical', 'hr'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_duration INTEGER, -- in seconds
    overall_score INTEGER,
    feedback JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create session components table
CREATE TABLE IF NOT EXISTS session_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL, -- 'resume_analysis', 'mcq', 'coding', 'hr'
    component_data JSONB NOT NULL,
    score INTEGER,
    completed_at TIMESTAMP,
    feedback JSONB DEFAULT '{}'::jsonb,
    UNIQUE(session_id, component_type) -- Prevent duplicate components per session
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_skills ON user_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_storage_method ON files(storage_method);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_file_id ON resume_analyses(file_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_date ON resume_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_started_at ON interview_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_session_components_session_id ON session_components(session_id);
CREATE INDEX IF NOT EXISTS idx_session_components_type ON session_components(component_type);

-- Create partial indexes for large files
CREATE INDEX IF NOT EXISTS idx_files_large_files ON files(id) 
WHERE storage_method = 'filesystem' AND file_size > 10485760;

-- Optimize BYTEA storage
ALTER TABLE files ALTER COLUMN file_data SET STORAGE MAIN;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- You can uncomment these lines if you want to add test data

/*
-- Sample user (replace with your actual Firebase UID)
INSERT INTO users (firebase_uid, email, first_name, last_name) 
VALUES ('sample-firebase-uid', 'test@example.com', 'Test', 'User')
ON CONFLICT (firebase_uid) DO NOTHING;
*/

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cvvin_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cvvin_user;

COMMIT;




