-- Add cleanup job tracking (optional, for scheduled cleanup tasks)

CREATE TABLE IF NOT EXISTS cleanup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    items_processed INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_type_status ON cleanup_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_created_at ON cleanup_jobs(created_at);

