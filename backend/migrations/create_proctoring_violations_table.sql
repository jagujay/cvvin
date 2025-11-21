-- Create proctoring_violations table
CREATE TABLE IF NOT EXISTS proctoring_violations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    details TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session FOREIGN KEY (session_id) 
        REFERENCES interview_sessions(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session_id 
    ON proctoring_violations(session_id);

CREATE INDEX IF NOT EXISTS idx_proctoring_violations_timestamp 
    ON proctoring_violations(timestamp);

CREATE INDEX IF NOT EXISTS idx_proctoring_violations_type 
    ON proctoring_violations(violation_type);

CREATE INDEX IF NOT EXISTS idx_proctoring_violations_severity 
    ON proctoring_violations(severity);

COMMENT ON TABLE proctoring_violations IS 'Stores proctoring violations detected during interview sessions';
COMMENT ON COLUMN proctoring_violations.violation_type IS 'Type of violation: TAB_SWITCH, WINDOW_SWITCH, FULLSCREEN_EXIT, OBJECT_DETECTED, MULTIPLE_FACES, AUDIO_DETECTED';
COMMENT ON COLUMN proctoring_violations.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN proctoring_violations.metadata IS 'Additional metadata about the violation';










